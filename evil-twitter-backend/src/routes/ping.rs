#[utoipa::path(
    get,
    path = "/ping",
    responses(
        (status = 200, description = "Pong response", body = String)
    )
)]
pub async fn ping_handler() -> &'static str {
    "Pong"
}
