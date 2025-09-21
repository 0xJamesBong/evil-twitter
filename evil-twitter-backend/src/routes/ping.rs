use axum::Json;

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/ping",
    responses(
        (status = 200, description = "API is running")
    ),
    tag = "health"
)]
pub async fn ping_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({"status": "ok", "message": "😈 Evil Twitter API is running"}))
}
