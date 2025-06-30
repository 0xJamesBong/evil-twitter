use crate::routes::image::AppState;
use std::sync::Arc;
use utoipa_axum::{router::OpenApiRouter, routes};

/// Get todo by id and name.
#[utoipa::path(
    get,
    path = "/ping",
    responses(
        (status = 200, description = "Ping success", body = String)
    )
)]
pub async fn ping_handler() -> Result<String, String> {
    Ok("pong".to_string())
}

pub fn ping_routes() -> OpenApiRouter {
    OpenApiRouter::new().routes(routes!(ping_handler))
}
