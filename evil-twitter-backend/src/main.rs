use axum::routing::{delete, get, post};
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};

use mongodb::Client;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_swagger_ui::SwaggerUi;

mod models;
mod routes;

use routes::follow::{follow_user, unfollow_user};
use routes::ping::ping_handler;
use routes::tweet::{create_tweet, generate_fake_tweets, get_tweet, get_tweets, like_tweet};
use routes::user::{create_user, get_user, get_users, login_user};

/// API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        routes::ping::ping_handler,
        routes::user::create_user,
        routes::user::get_user,
        routes::user::get_users,
        routes::user::login_user,
        routes::tweet::create_tweet,
        routes::tweet::get_tweet,
        routes::tweet::get_tweets,
        routes::tweet::like_tweet,
        routes::tweet::generate_fake_tweets,
        routes::follow::follow_user,
        routes::follow::unfollow_user
    ),
    components(
        schemas(
            models::user::User,
            models::user::CreateUser,
            models::user::LoginRequest,
            models::user::LoginResponse,
            models::tweet::Tweet,
            models::tweet::CreateTweet,
            models::tweet::TweetWithAuthor,
            models::follow::Follow,
            models::follow::CreateFollow
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "tweets", description = "Tweet management endpoints"),
        (name = "follows", description = "Follow management endpoints"),
        (name = "auth", description = "Authentication endpoints")
    ),
    info(
        title = "Evil Twitter API",
        version = "1.0.0",
        description = "A minimal Twitter clone API"
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok(); // load .env
    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let (app, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .route("/ping", get(ping_handler))
        .route("/users", post(create_user).get(get_users))
        .route("/users/{id}", get(get_user))
        .route("/auth/login", post(login_user))
        .route("/tweets", post(create_tweet).get(get_tweets))
        .route("/tweets/{id}", get(get_tweet))
        .route("/tweets/{id}/like", post(like_tweet))
        .route("/tweets/fake", post(generate_fake_tweets))
        .route("/follows", post(follow_user))
        .route("/follows/{following_id}", delete(unfollow_user))
        .split_for_parts();

    let app = app
        .merge(SwaggerUi::new("/doc").url("/api-docs/openapi.json", api))
        .with_state(db)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    println!("🚀 Evil Twitter API listening on http://0.0.0.0:3000");
    println!("📚 Swagger UI available at http://0.0.0.0:3000/doc");

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
