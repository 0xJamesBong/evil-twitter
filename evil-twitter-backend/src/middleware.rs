use std::{fmt::Display, sync::Arc};

use axum::{
    body::Body,
    extract::{Request, State},
    http::{self},
    middleware::Next,
    response::{IntoResponse, Response},
};
use axum_extra::extract::CookieJar;
use bson::Uuid;
use http_body_util::BodyExt;
use tracing::error;

use crate::{
    app_state::AppState,
    consts::SESSION_COOKIE_NAME,
    err::{ApiResponse, AppError, AppErrorCode, HttpErrorResponse},
    utils::{TraceId, gen_trace_id},
};

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct CustomClaims {
    pub sid: String,
}

#[derive(Debug, Clone)]
pub struct UserId(pub String);
#[derive(Debug, Clone)]
pub struct MaybeUserId(pub Option<Result<Uuid, AppError>>);

impl Display for MaybeUserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            self.0
                .as_ref()
                .and_then(|it| it.as_ref().ok())
                .map(|it| it.to_string())
                .unwrap_or_else(|| "None".to_string())
        )
    }
}

pub async fn inject_trace_id(
    mut req: Request,
    next: Next,
) -> Result<axum::response::Response, impl IntoResponse> {
    let trace_id = req
        .headers()
        .get("x-trace-id")
        .and_then(|header| header.to_str().ok())
        .map(|value| TraceId(value.to_string()))
        .unwrap_or_else(gen_trace_id);
    let uri = req.uri().to_string();

    req.extensions_mut().insert(trace_id.clone());
    let res = next.run(req).await;

    let (mut res_parts, res_body) = res.into_parts();

    let res = if res_parts.status.is_client_error() || res_parts.status.is_server_error() {
        let bytes = res_body.collect().await.unwrap().to_bytes();

        let mut err = serde_json::from_slice::<HttpErrorResponse>(&bytes);
        let res = if let Ok(err) = &mut err {
            // expected HttpErrorResponse, inject trace id
            err.trace_id = Some(trace_id.0.clone());
            err
        } else {
            if bytes.starts_with(b"Invalid URL:") {
                // manually handle the invalid url error, most likely caused by invalid UUID format
                &mut HttpErrorResponse {
                    message: "Invalid URL format".to_string(),
                    error_code: AppErrorCode::BadRquest,
                    trace_id: Some(trace_id.0.clone()),
                }
            } else {
                // unexpedcted error
                error!(
                    "Failed to deserialize error response, err:{:?} uri:{:?}, {}",
                    bytes,
                    uri,
                    trace_id.0.clone()
                );
                &mut HttpErrorResponse {
                    message: "Internal server error (Unexpected error)".to_string(),
                    error_code: AppErrorCode::InternalServerError,
                    trace_id: Some(trace_id.0.clone()),
                }
            }
        };
        let bytes = serde_json::to_vec(&res).unwrap();
        let length = bytes.len();
        let res_body = Body::from(bytes);
        res_parts
            .headers
            .insert(http::header::CONTENT_LENGTH, length.into());
        Response::from_parts(res_parts, Body::from(res_body))
    } else {
        Response::from_parts(res_parts, Body::from(res_body))
    };
    Ok::<_, AppError>(res)
}

pub async fn try_extract_user_id(
    State(app_state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<axum::response::Response, impl IntoResponse> {
    let headers = req.headers();
    let cookie_jar = CookieJar::from_headers(&headers);

    let cookie_token = cookie_jar
        .get(SESSION_COOKIE_NAME)
        .map(|cookie| cookie.value());

    let result = if let Some(jwt) = cookie_token {
        Some(app_state.auth_service.verify_jwt(jwt).await)
    } else {
        None
    };

    let may_user_id = MaybeUserId(result);
    req.extensions_mut().insert(may_user_id);
    let res = next.run(req).await;
    Ok::<_, AppError>(res)
}

pub fn handle_panic(_err: Box<dyn std::any::Any + Send>) -> Response<Body> {
    let app_err = AppError::Panic;
    app_err.into_response()
}

pub async fn handler_404() -> ApiResponse<()> {
    Err(AppError::NotFound)
}
