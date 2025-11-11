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

// Re-export schema building function
pub use schema::build_schema;
