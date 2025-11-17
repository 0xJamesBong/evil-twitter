use axum::{
    Json,
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};

use crate::models::user::User;
use crate::services::{PrivyService, mongo_service::MongoService};

type ApiError = (StatusCode, Json<Value>);

fn json_error(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

fn internal_error(message: &str) -> ApiError {
    json_error(StatusCode::INTERNAL_SERVER_ERROR, message)
}

fn not_found(message: &str) -> ApiError {
    json_error(StatusCode::NOT_FOUND, message)
}

/// Extract Privy access token from authorization header
fn extract_privy_token(auth_header: &str) -> Result<String, String> {
    let token = match auth_header.strip_prefix("Bearer ") {
        Some(t) => t.trim(),
        None => return Err("Authorization header is not Bearer".into()),
    };
    Ok(token.to_string())
}

/// Extract the authenticated user from the authorization header using Privy
pub async fn get_authenticated_user(
    mongo_service: &MongoService,
    privy_service: &PrivyService,
    headers: &HeaderMap,
) -> Result<User, ApiError> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;

    let token = extract_privy_token(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization header: {err}"),
        )
    })?;

    // Verify token with Privy and get user ID (DID)
    let privy_id = privy_service
        .verify_access_token(&token)
        .await
        .map_err(|err| {
            json_error(
                StatusCode::UNAUTHORIZED,
                format!("Invalid Privy token: {}", err),
            )
        })?;

    // Get user from database by Privy ID
    let user = mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await
        .map_err(|e| internal_error(&format!("Database error fetching user: {:?}", e)))?
        .ok_or_else(|| not_found("User not found"))?;

    Ok(user)
}

/// Extract the authenticated user's ObjectId from the authorization header
pub async fn get_authenticated_user_id(
    mongo_service: &MongoService,
    privy_service: &PrivyService,
    headers: &HeaderMap,
) -> Result<mongodb::bson::oid::ObjectId, ApiError> {
    let user = get_authenticated_user(mongo_service, privy_service, headers).await?;
    user.id
        .ok_or_else(|| internal_error("User record missing identifier"))
}

/// Get Privy ID from authorization header (for GraphQL context)
pub async fn get_privy_id_from_header(
    privy_service: &PrivyService,
    headers: &HeaderMap,
) -> Result<String, ApiError> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;

    let token = extract_privy_token(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization header: {err}"),
        )
    })?;

    privy_service
        .verify_access_token(&token)
        .await
        .map_err(|err| {
            json_error(
                StatusCode::UNAUTHORIZED,
                format!("Invalid Privy token: {}", err),
            )
        })
}
