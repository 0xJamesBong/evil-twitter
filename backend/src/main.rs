use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};

// use image_remix_api::{db::connect_to_db, models::image::Image};
use mongodb::Database;

use std::net::SocketAddr; // adjust path

async fn ping_handler() -> &'static str {
    "pong"
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let app = Router::new().route("/ping", get(ping_handler));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("🚀 Listening on http://0.0.0.0:3000");

    axum::serve(listener, app).await?;

    Ok(())
}
