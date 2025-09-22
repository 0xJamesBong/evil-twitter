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
use routes::tweet::{
    clear_all_data, create_tweet, generate_fake_tweets, get_tweet, get_tweets, get_user_wall,
    like_tweet, migrate_health, quote_tweet, reply_tweet, retweet_tweet,
};
use routes::user::{create_user, get_user, get_users};
use routes::wall::compose_wall;

/// API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        routes::ping::ping_handler,
        routes::user::create_user,
        routes::user::get_user,
        routes::user::get_users,
        routes::tweet::create_tweet,
        routes::tweet::get_tweet,
        routes::tweet::get_tweets,
        routes::tweet::get_user_wall,
        routes::tweet::like_tweet,
        routes::tweet::retweet_tweet,
        routes::tweet::quote_tweet,
        routes::tweet::reply_tweet,
        routes::tweet::generate_fake_tweets,
        routes::tweet::clear_all_data,
        routes::tweet::migrate_health,
        routes::follow::follow_user,
        routes::follow::unfollow_user
    ),
    components(
        schemas(
            models::user::User,
            models::user::CreateUser,
            models::tweet::Tweet,
            models::tweet::TweetType,
            models::tweet::CreateTweet,
            models::tweet::CreateReply,
            models::tweet::CreateQuote,
            models::follow::Follow,
            models::follow::CreateFollow
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "tweets", description = "Tweet management endpoints"),
        (name = "follows", description = "Follow management endpoints"),
        (name = "auth", description = "Authentication endpoints"),
        (name = "admin", description = "Administrative endpoints")
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
        .route("/users/{user_id}/wall", get(get_user_wall))
        .route("/users/{user_id}/wall/compose", get(compose_wall))
        .route("/tweets", post(create_tweet).get(get_tweets))
        .route("/tweets/{id}", get(get_tweet))
        .route("/tweets/{id}/like", post(like_tweet))
        .route("/tweets/{id}/retweet", post(retweet_tweet))
        .route("/tweets/{id}/quote", post(quote_tweet))
        .route("/tweets/{id}/reply", post(reply_tweet))
        .route("/tweets/fake", post(generate_fake_tweets))
        .route("/admin/clear-all", post(clear_all_data))
        .route("/admin/migrate-health", post(migrate_health))
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
