use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};
use dotenvy::dotenv;

// use image_remix_api::{db::connect_to_db, models::image::Image};
use mongodb::{Client, Database};

use std::{net::SocketAddr, sync::Arc}; // adjust path

mod models;
mod routes;

use routes::image::AppState;

// async fn ping_handler() -> &'static str {
//     "pong"
// }
use routes::image::{create_image, list_images, ping_handler};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok(); // load .env
    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGO_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB must be set");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);

    let shared_state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/ping", get(ping_handler))
        .route("/images", post(create_image).get(list_images))
        .with_state(shared_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("🚀 Listening on http://0.0.0.0:3000");

    axum::serve(listener, app).await?;

    Ok(())
}
