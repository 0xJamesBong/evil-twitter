// ============================================================================
// Module Organization
// ============================================================================
// This module organizes all tweet-related GraphQL code:
// - types.rs: GraphQL types (TweetNode, TweetConnection, etc.)
// - queries.rs: Query resolvers (tweet, tweet_thread, timeline)
// - mutations.rs: Mutation resolvers (create, like, smack, etc.)

pub mod mutations;
pub mod queries;
pub mod types;

// Re-export types for convenience
pub use types::*;

// Re-export queries
pub use queries::{
    TweetQuery, timeline_resolver as timeline, tweet_resolver as tweet,
    tweet_thread_resolver as tweet_thread,
};

// Re-export mutations
pub use mutations::{
    TweetCreateInput, TweetMetricsPayload, TweetMutation, TweetPayload, TweetQuoteInput,
    TweetReplyInput,
};
