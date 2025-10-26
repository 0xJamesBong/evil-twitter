use axum::routing::{delete, get, post};
use dotenvy::dotenv;
use tower::ServiceBuilder;
use tower::limit::GlobalConcurrencyLimitLayer;
use tower_http::cors::CorsLayer;

use mongodb::Client;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_swagger_ui::SwaggerUi;

mod actions;
mod middleware;
mod models;
mod routes;
mod utils;

use routes::data_generation::{
    clear_all_data, generate_fake_data, generate_fake_tweets, generate_fake_users,
};
use routes::economy::{
    adjust_user_balance, cancel_listing, create_asset, create_listing, create_shop_item,
    get_user_assets, get_user_balances, list_marketplace_listings, list_shop_items,
    purchase_listing, purchase_shop_item,
};
use routes::follow::{follow_user, get_followers_list, get_following_list, unfollow_user};
use routes::migration::{migrate_user_objectids, migrate_users_weapons};
use routes::ping::ping_handler;
use routes::tweet::{
    attack_tweet, create_tweet, get_thread, get_tweet, get_tweets, get_user_wall, like_tweet,
    migrate_users_dollar_rate, quote_tweet, reply_tweet, retweet_tweet, support_tweet,
};
use routes::user::{
    attack_dollar_rate, create_user, get_dollar_rate, get_user, get_users, improve_dollar_rate,
};
use routes::weapons::{buy_weapon, get_user_weapons, get_weapon_catalog_endpoint};

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
        routes::tweet::get_thread,
        routes::tweet::get_user_wall,
        routes::tweet::like_tweet,
        routes::tweet::support_tweet,
        routes::tweet::attack_tweet,
        routes::tweet::retweet_tweet,
        routes::tweet::quote_tweet,
        routes::tweet::reply_tweet,
        routes::data_generation::generate_fake_users,
        routes::data_generation::generate_fake_tweets,
        routes::data_generation::generate_fake_data,
        routes::data_generation::clear_all_data,
        routes::tweet::migrate_users_dollar_rate,
        routes::migration::migrate_users_weapons,
        routes::migration::migrate_user_objectids,
        routes::follow::follow_user,
        routes::follow::unfollow_user,
        routes::follow::get_follow_status,
        routes::follow::get_following_list,
        routes::follow::get_followers_list,
        routes::weapons::buy_weapon,
        routes::weapons::get_user_weapons,
        routes::weapons::get_weapon_catalog_endpoint,
        routes::economy::get_user_balances,
        routes::economy::adjust_user_balance,
        routes::economy::create_asset,
        routes::economy::get_user_assets,
        routes::economy::create_shop_item,
        routes::economy::list_shop_items,
        routes::economy::purchase_shop_item,
        routes::economy::create_listing,
        routes::economy::list_marketplace_listings,
        routes::economy::purchase_listing,
        routes::economy::cancel_listing
    ),
    components(
        schemas(
            models::user::User,
            models::user::CreateUser,
            models::user::ImproveRateRequest,
            models::user::AttackRateRequest,
            models::tweet::Tweet,
            models::tweet::TweetView,
            models::tweet::TweetType,
            models::tweet::CreateTweet,
            models::tweet::CreateReply,
            models::tweet::CreateQuote,
            models::tweet::TweetAttackAction,
            models::tweet::TweetMetrics,
            models::tweet::TweetAuthorSnapshot,
            models::tweet::TweetViewerContext,
            models::tweet::TweetEnergyState,
            models::follow::Follow,
            models::follow::FollowRequest,
            models::follow::FollowResponse,
            models::follow::FollowStats,
            routes::follow::FollowingListResponse,
            routes::follow::FollowersListResponse,
            routes::data_generation::DataGenerationResponse,
            routes::data_generation::UserGenerationRequest,
            routes::data_generation::TweetGenerationRequest,
            models::tool::Tool,
            routes::tweet::SupportTweetRequest,
            routes::tweet::AttackTweetRequest,
            routes::tweet::TweetListResponse,
            routes::tweet::TweetThreadResponse,
            routes::weapons::BuyWeaponRequest,
            models::weapon_catalog::WeaponCatalogItem,
            routes::migration::MigrationResponse,
            models::token::TokenBalance,
            models::token::TokenLedgerEntry,
            models::token::LedgerEntryType,
            models::asset::Asset,
            models::asset::AssetType,
            models::asset::AssetStatus,
            models::shop::ShopItem,
            models::shop::ShopPurchaseReceipt,
            models::marketplace::AssetListing,
            models::marketplace::ListingStatus,
            models::marketplace::TradeReceipt,
            routes::economy::AdjustBalanceRequest,
            routes::economy::CreateAssetRequest,
            routes::economy::CreateShopItemRequest,
            routes::economy::PurchaseShopItemRequest,
            routes::economy::CreateListingRequest,
            routes::economy::PurchaseListingRequest
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "tweets", description = "Tweet management endpoints"),
        (name = "follows", description = "Follow management endpoints"),
        (name = "weapons", description = "Weapon management endpoints"),
        (name = "economy", description = "Token, asset, and marketplace endpoints"),
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
    println!("Starting Evil Twitter API...");

    dotenv().ok(); // load .env
    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);

    // Configure CORS
    // let cors = CorsLayer::new()
    //     .allow_origin(Any)
    //     .allow_methods(Any)
    //     .allow_headers(Any);
    let cors = CorsLayer::very_permissive();

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
        .route("/tweets/{id}/thread", get(get_thread))
        .route("/tweets/{id}/like", post(like_tweet))
        .route("/tweets/{id}/support", post(support_tweet))
        .route("/tweets/{id}/attack", post(attack_tweet))
        .route("/tweets/{id}/retweet", post(retweet_tweet))
        .route("/tweets/{id}/quote", post(quote_tweet))
        .route("/tweets/{id}/reply", post(reply_tweet))
        .route("/data/users/generate", post(generate_fake_users))
        .route("/data/tweets/generate", post(generate_fake_tweets))
        .route("/data/generate", post(generate_fake_data))
        .route("/data/clear", delete(clear_all_data))
        .route("/admin/migrate-users-weapons", post(migrate_users_weapons))
        .route(
            "/admin/migrate-user-objectids",
            post(migrate_user_objectids),
        )
        .route(
            "/admin/migrate-users-dollar-rate",
            post(migrate_users_dollar_rate),
        )
        .route("/users/{user_id}/follow", post(follow_user))
        .route("/users/{user_id}/follow", delete(unfollow_user))
        .route(
            "/users/{user_id}/follow-status",
            get(routes::follow::get_follow_status),
        )
        .route("/users/{user_id}/following", get(get_following_list))
        .route("/users/{user_id}/followers", get(get_followers_list))
        .route("/weapons/catalog", get(get_weapon_catalog_endpoint))
        .route("/weapons/{user_id}/buy", post(buy_weapon))
        .route("/users/{user_id}/weapons", get(get_user_weapons))
        .route("/economy/users/{user_id}/balances", get(get_user_balances))
        .route(
            "/economy/users/{user_id}/balances/adjust",
            post(adjust_user_balance),
        )
        .route("/economy/assets", post(create_asset))
        .route("/economy/users/{user_id}/assets", get(get_user_assets))
        .route(
            "/economy/shop/items",
            post(create_shop_item).get(list_shop_items),
        )
        .route(
            "/economy/shop/items/{item_id}/purchase",
            post(purchase_shop_item),
        )
        .route(
            "/economy/marketplace/listings",
            post(create_listing).get(list_marketplace_listings),
        )
        .route(
            "/economy/marketplace/listings/{listing_id}",
            delete(cancel_listing),
        )
        .route(
            "/economy/marketplace/listings/{listing_id}/buy",
            post(purchase_listing),
        )
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
    println!("Evil Twitter API listening on http://{}", addr);
    println!("Swagger UI available at http://{}/doc", addr);

    let service = ServiceBuilder::new()
        .layer(GlobalConcurrencyLimitLayer::new(200))
        .service(app.into_make_service());

    axum::serve(listener, service).await?;

    Ok(())
}
