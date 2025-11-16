use std::sync::Arc;

use dotenvy::dotenv;
use mongodb::Client;

use evil_twitter::{app, app_state::AppState};

#[tokio::main]

async fn main() -> anyhow::Result<()> {
    println!("Starting Evil Twitter API...");

    dotenv().ok(); // load .env
    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);

    // Create application state
    let app_state = Arc::new(AppState::new(db.clone()));

    let app = app(app_state.clone()).await;

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

// async fn main() -> anyhow::Result<()> {
//     println!("Starting Evil Twitter API...");

//     dotenv().ok(); // load .env
//     let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
//     let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");
//     let client = Client::with_uri_str(&mongo_uri).await?;
//     let db = client.database(&mongo_db);

//     // Create application state
//     let app_state = Arc::new(app_state::AppState::new(db.clone()));

//     // Configure CORS
//     // let cors = CorsLayer::new()
//     //     .allow_origin(Any)
//     //     .allow_methods(Any)
//     //     .allow_headers(Any);
//     let cors = CorsLayer::very_permissive();

//     let (app, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
//         .route("/ping", get(ping_handler))
//         .split_for_parts();

//     // Create GraphQL routes with app state
//     let graphql_routes: axum::Router = graphql::graphql_routes(app_state.clone());

//     // Add Database state to REST router, then merge with GraphQL router
//     let app = app
//         .with_state(app_state.db.clone())
//         .merge(graphql_routes)
//         .merge(SwaggerUi::new("/doc").url("/api-docs/openapi.json", api))
//         .layer(cors);

//     // let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
//     // println!("🚀 Evil Twitter API listening on http://0.0.0.0:3000");
//     // println!("📚 Swagger UI available at http://0.0.0.0:3000/doc");

//     let port = std::env::var("PORT")
//         .unwrap_or_else(|_| "3000".to_string()) // default for local dev
//         .parse::<u16>()
//         .expect("PORT must be a number");
//     let addr = format!("0.0.0.0:{}", port);
//     let listener = tokio::net::TcpListener::bind(&addr).await?;
//     println!("Evil Twitter API listening on http://{}", addr);
//     println!("Swagger UI available at http://{}/doc", addr);

//     axum::serve(listener, app.into_make_service()).await?;

//     Ok(())
// }
