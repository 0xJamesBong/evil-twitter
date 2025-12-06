use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;

pub mod app_state;
pub mod graphql;
pub mod models;
pub mod routes;
pub mod services;
pub mod solana;
pub mod utils;


use crate::app_state::AppState;
use crate::graphql::graphql_routes;

use axum::{Router, routing::get};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use utoipa_swagger_ui::SwaggerUi;

use crate::routes::{
    ping::ping_handler,
};

/// API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::ping::ping_handler,
        
    ),
    components(
        schemas(
            models::user::User,
            models::follow::Follow,
            models::follow::FollowRequest,
            models::follow::FollowResponse,
            models::follow::FollowStats,
            
        )
    ),
    tags(
    
        (name = "users", description = "User management endpoints"),
        (name = "tweets", description = "Tweet management endpoints"),
        (name = "follows", description = "Follow management endpoints"),
        
    ),
    info(
        title = "Evil Twitter API",
        version = "1.0.0",
        description = "A minimal Twitter clone API"
    )
)]
struct ApiDoc;
pub async fn app(app_state: Arc<AppState>) -> Router {
    let cors = CorsLayer::very_permissive();
    let graphql_routes = graphql_routes(app_state.clone());

    let (app, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .route("/ping", get(ping_handler))
        .split_for_parts();

    let app = app
        .with_state(app_state.clone())
        .merge(graphql_routes)
        .merge(SwaggerUi::new("/doc").url("/api-docs/openapi.json", api))
        .layer(cors);

    app
}
