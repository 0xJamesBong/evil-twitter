// ============================================================================
// Module Organization
// ============================================================================
// This module organizes all user-related GraphQL code:
// - types.rs: GraphQL types (UserNode, TokenBalancesSummary, etc.)
// - queries.rs: Query resolvers (user, search_users, discover_users)
// - mutations.rs: Mutation resolvers (placeholder for now)

pub mod mutations;
pub mod queries;
pub mod types;

// Re-export types for convenience
pub use types::*;

// Re-export queries
pub use queries::{UserQuery, discover_users_resolver as discover_users, search_users_resolver as search_users, user_resolver as user};

// Re-export mutations
pub use mutations::UserMutation;
