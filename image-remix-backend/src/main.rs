use axum::{
    Json, Router,
    extract::State,
    routing::{delete, get, post, put},
};
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};

// use image_remix_api::{db::connect_to_db, models::image::Image};
use mongodb::{Client, Database};

use std::{net::SocketAddr, sync::Arc}; // adjust path
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};
use utoipa_swagger_ui::SwaggerUi;

mod models;
mod routes;

use routes::image::AppState;

// async fn ping_handler() -> &'static str {
//     "pong"
// }
use routes::image::{create_image, delete_image, get_images, ping_handler, update_image};

/// API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        routes::image::ping_handler,
        routes::image::create_image,
        routes::image::get_images,
        routes::image::delete_image,
        routes::image::update_image
    ),
    components(
        schemas(
            models::image::Image,
            models::image::NewImage,
            models::image::RemixMaterial
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "images", description = "Image management endpoints")
    ),
    info(
        title = "Image Remix API",
        version = "1.0.0",
        description = "API for managing and remixing images"
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok(); // load .env
    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGO_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB must be set");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);

    let shared_state = Arc::new(AppState { db });

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let (app, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .route("/ping", get(ping_handler))
        .route("/images", post(create_image).get(get_images))
        .route("/images/{id}", delete(delete_image).put(update_image))
        .split_for_parts();

    let app = app
        .merge(SwaggerUi::new("/doc").url("/api-docs/openapi.json", api))
        .with_state(shared_state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("🚀 Listening on http://0.0.0.0:3000");
    println!("📚 Swagger UI available at http://0.0.0.0:3000/doc");

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
