use async_graphql::{MergedObject, Object};

use crate::graphql::tweet::TweetMutation;
use crate::graphql::user::UserMutation;

// ============================================================================
// Base MutationRoot (for shared mutations like ping)
// ============================================================================

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Ping mutation for testing
    async fn ping(&self) -> String {
        "pong".to_string()
    }
}

// ============================================================================
// MergedMutationRoot (combines all feature mutations)
// ============================================================================

#[derive(MergedObject, Default)]
pub struct MergedMutationRoot(MutationRoot, UserMutation, TweetMutation);
