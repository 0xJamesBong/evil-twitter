use async_graphql::{MergedObject, Object};

use crate::graphql::tweet::TweetQuery;
use crate::graphql::user::UserQuery;

// ============================================================================
// Base QueryRoot (for shared queries like health checks)
// ============================================================================

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Health check endpoint for GraphQL
    async fn health(&self) -> &'static str {
        "ok"
    }
}

// ============================================================================
// MergedQueryRoot (combines all feature queries)
// ============================================================================

#[derive(MergedObject, Default)]
pub struct MergedQueryRoot(QueryRoot, UserQuery, TweetQuery);
