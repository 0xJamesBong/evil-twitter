use axum::routing::{delete, get, post};
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};

use mongodb::Client;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_swagger_ui::SwaggerUi;

mod middleware;
mod models;
mod routes;

use routes::follow::{follow_user, unfollow_user};
use routes::ping::ping_handler;
use routes::tweet::{
    attack_tweet, clear_all_data, create_tweet, generate_fake_tweets, get_tweet, get_tweets,
    get_user_wall, heal_tweet, like_tweet, migrate_health, migrate_users_dollar_rate, quote_tweet,
    reply_tweet, retweet_tweet,
};
use routes::user::{
    attack_dollar_rate, create_user, get_dollar_rate, get_user, get_users, improve_dollar_rate,
};

/// API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        routes::ping::ping_handler,
        routes::user::create_user,
        routes::user::get_user,
        routes::user::get_users,
        routes::user::improve_dollar_rate,
        routes::user::attack_dollar_rate,
        routes::user::get_dollar_rate,
        routes::tweet::create_tweet,
        routes::tweet::get_tweet,
        routes::tweet::get_tweets,
        routes::tweet::get_user_wall,
        routes::tweet::like_tweet,
        routes::tweet::heal_tweet,
        routes::tweet::attack_tweet,
        routes::tweet::retweet_tweet,
        routes::tweet::quote_tweet,
        routes::tweet::reply_tweet,
        routes::tweet::generate_fake_tweets,
        routes::tweet::clear_all_data,
        routes::tweet::migrate_health,
        routes::tweet::migrate_users_dollar_rate,
        routes::follow::follow_user,
        routes::follow::unfollow_user
    ),
    components(
        schemas(
            models::user::User,
            models::user::CreateUser,
            models::user::ImproveRateRequest,
            models::user::AttackRateRequest,
            models::tweet::Tweet,
            models::tweet::TweetType,
            models::tweet::CreateTweet,
            models::tweet::CreateReply,
            models::tweet::CreateQuote,
            models::tweet::TweetHealthHistory,
            models::tweet::TweetHealAction,
            models::tweet::TweetAttackAction,
            models::follow::Follow,
            models::follow::CreateFollow,
            routes::tweet::HealTweetRequest,
            routes::tweet::AttackTweetRequest
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
        .route("/users/{user_id}/improve", post(improve_dollar_rate))
        .route("/users/{user_id}/attack", post(attack_dollar_rate))
        .route("/users/{user_id}/dollar-rate", get(get_dollar_rate))
        .route("/users/{user_id}/wall", get(get_user_wall))
        .route("/users/{id}", get(get_user))
        .route("/tweets", post(create_tweet).get(get_tweets))
        .route("/tweets/{id}", get(get_tweet))
        .route("/tweets/{id}/like", post(like_tweet))
        .route("/tweets/{id}/heal", post(heal_tweet))
        .route("/tweets/{id}/attack", post(attack_tweet))
        .route("/tweets/{id}/retweet", post(retweet_tweet))
        .route("/tweets/{id}/quote", post(quote_tweet))
        .route("/tweets/{id}/reply", post(reply_tweet))
        .route("/tweets/fake", post(generate_fake_tweets))
        .route("/admin/clear-all", post(clear_all_data))
        .route("/admin/migrate-health", post(migrate_health))
        .route(
            "/admin/migrate-users-dollar-rate",
            post(migrate_users_dollar_rate),
        )
        .route("/follows", post(follow_user))
        .route("/follows/{following_id}", delete(unfollow_user))
        .split_for_parts();

    let app = app
        .merge(SwaggerUi::new("/doc").url("/api-docs/openapi.json", api))
        .with_state(db)
        .layer(cors);

    // let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    // println!("🚀 Evil Twitter API listening on http://0.0.0.0:3000");
    // println!("📚 Swagger UI available at http://0.0.0.0:3000/doc");

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string()) // default for local dev
        .parse::<u16>()
        .expect("PORT must be a number");
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("🚀 Evil Twitter API listening on http://{}", addr);
    println!("📚 Swagger UI available at http://{}/doc", addr);

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
