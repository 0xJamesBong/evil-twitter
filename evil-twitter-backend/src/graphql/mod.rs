use axum::{Router, routing::get};
use std::sync::Arc;

use crate::app_state::AppState;

pub mod handlers;
pub mod mutations;
pub mod queries;
pub mod schema;
pub mod tracing;
pub mod tweet;
pub mod types;
pub mod user;

use mongodb::Database;

#[derive(Clone)]
pub struct GraphQLState {
    pub db: Database,
}

// Re-export schema building function (used internally)
use schema::build_schema;

/// Create GraphQL routes with the given application state
pub fn graphql_routes(app_state: Arc<AppState>) -> Router {
    let schema = schema::build_schema(app_state.db.clone());

    Router::new()
        .route(
            "/graphql",
            get(handlers::graphql_handler).post(handlers::graphql_handler),
        )
        .route("/graphiql", get(handlers::graphiql_handler))
        .with_state((schema, app_state))
}
