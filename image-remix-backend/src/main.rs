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
mod services;

use routes::image::AppState;
use services::ai_remix::AiRemixService;

// async fn ping_handler() -> &'static str {
//     "pong"
// }
use routes::image::{
    ai_health_check, create_image, delete_image, download_image_file, get_images, remix_image,
    update_image,
};
use routes::ping::ping_handler;

/// API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        routes::ping::ping_handler,
        routes::image::create_image,
        routes::image::get_images,
        routes::image::delete_image,
        routes::image::update_image,
        routes::image::download_image_file,
        routes::image::remix_image,
        routes::image::ai_health_check
    ),
    components(
        schemas(
            models::image::Image,
            models::image::NewImage,
            models::image::RemixMaterial,
            models::image::AiProcessingRequest,
            models::image::AiProcessingResult
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "images", description = "Image management endpoints")
    ),
    info(
        title = "Image Remix API",
        version = "1.0.0",
        description = "API for managing and remixing images with GridFS storage"
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

    // Initialize AI remix service
    let python_service_url =
        std::env::var("PYTHON_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let ai_remix = Arc::new(AiRemixService::new(python_service_url));

    let shared_state = Arc::new(AppState { db, ai_remix });

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let (app, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .route("/ping", get(ping_handler))
        .route("/images", post(create_image).get(get_images))
        .route("/images/{id}", delete(delete_image).put(update_image))
        .route("/images/{id}/file", get(download_image_file))
        .route("/images/{id}/remix", post(remix_image))
        .route("/ai/health", get(ai_health_check))
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
