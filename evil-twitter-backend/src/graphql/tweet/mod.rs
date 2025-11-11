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
    TweetAttackInput, TweetCreateInput, TweetEnergyPayload, TweetMetricsPayload, TweetMutation,
    TweetPayload, TweetQuoteInput, TweetReplyInput, TweetSmackPayload, TweetSupportInput,
    tweet_attack_resolver as tweet_attack, tweet_create_resolver as tweet_create,
    tweet_like_resolver as tweet_like, tweet_quote_resolver as tweet_quote,
    tweet_reply_resolver as tweet_reply, tweet_retweet_resolver as tweet_retweet,
    tweet_smack_resolver as tweet_smack, tweet_support_resolver as tweet_support,
};
