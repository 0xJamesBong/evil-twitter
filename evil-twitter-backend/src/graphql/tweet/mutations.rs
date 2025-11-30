use async_graphql::{Context, ID, InputObject, Object, Result, SimpleObject};
use axum::http::HeaderMap;
use mongodb::bson::oid::ObjectId;
use std::str::FromStr;

use hex;
use std::sync::Arc;

use crate::{
    app_state::AppState, graphql::tweet::types::TweetNode, models::user::User, solana::get_post_pda,
};

// ============================================================================
// Input Types
// ============================================================================

#[derive(InputObject)]
pub struct TweetCreateInput {
    pub content: String,
}

#[derive(InputObject)]
pub struct TweetReplyInput {
    pub content: String,
    pub replied_to_id: ID,
}

#[derive(InputObject)]
pub struct TweetQuoteInput {
    pub content: String,
    pub quoted_tweet_id: ID,
}

#[derive(InputObject)]
pub struct TweetSupportInput {
    pub tool_id: Option<ID>,
}

#[derive(InputObject)]
pub struct TweetAttackInput {
    pub tool_id: ID,
}

#[derive(InputObject)]
pub struct TweetVoteInput {
    pub tweet_id: ID,
    pub side: String, // "pump" or "smack"
    pub votes: u64,
    pub token_mint: Option<String>, // Optional, defaults to BLING
}

// ============================================================================
// Payload Types
// ============================================================================

#[derive(SimpleObject)]
pub struct TweetPayload {
    pub tweet: TweetNode,
    pub onchain_signature: Option<String>,
}

#[derive(SimpleObject)]
pub struct TweetMetricsPayload {
    pub id: ID,
    pub like_count: i64,
    pub smack_count: i64,
    pub liked_by_viewer: bool,
    pub energy: f64,
}

#[derive(SimpleObject)]
pub struct TweetEnergyPayload {
    pub id: ID,
    pub energy: f64,
    pub energy_before: f64,
    pub energy_after: f64,
    pub delta: f64,
}

#[derive(SimpleObject)]
pub struct TweetSmackPayload {
    pub id: ID,
    pub energy: f64,
    pub tokens_charged: i64,
    pub tokens_paid_to_author: i64,
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn get_authenticated_user_from_ctx(ctx: &Context<'_>) -> Result<User> {
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    let app_state = ctx.data::<Arc<AppState>>()?;
    crate::utils::auth::get_authenticated_user(
        &app_state.mongo_service,
        &app_state.privy_service,
        headers,
    )
    .await
    .map_err(|(status, json)| {
        let error_msg = json
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Authentication failed");
        async_graphql::Error::new(format!("{} (status {})", error_msg, status))
    })
}

fn parse_object_id(id: &ID) -> Result<ObjectId> {
    ObjectId::parse_str(id.as_str())
        .map_err(|_| async_graphql::Error::new("Invalid ObjectId format"))
}

// ============================================================================
// TweetMutation Object
// ============================================================================

#[derive(Default)]
pub struct TweetMutation;

#[Object]
impl TweetMutation {
    /// Create a new tweet
    async fn tweet_create(
        &self,
        ctx: &Context<'_>,
        input: TweetCreateInput,
    ) -> Result<TweetPayload> {
        tweet_create_resolver(ctx, input).await
    }

    /// Like or unlike a tweet (toggle)
    async fn tweet_like(
        &self,
        ctx: &Context<'_>,
        id: ID,
        idempotency_key: Option<String>,
    ) -> Result<TweetMetricsPayload> {
        tweet_like_resolver(ctx, id, idempotency_key).await
    }

    /// Reply to a tweet
    async fn tweet_reply(&self, ctx: &Context<'_>, input: TweetReplyInput) -> Result<TweetPayload> {
        tweet_reply_resolver(ctx, input).await
    }

    /// Quote a tweet
    async fn tweet_quote(&self, ctx: &Context<'_>, input: TweetQuoteInput) -> Result<TweetPayload> {
        tweet_quote_resolver(ctx, input).await
    }

    /// Retweet a tweet
    async fn tweet_retweet(&self, ctx: &Context<'_>, id: ID) -> Result<TweetPayload> {
        tweet_retweet_resolver(ctx, id).await
    }

    /// Vote on a tweet (Pump or Smack)
    async fn tweet_vote(
        &self,
        ctx: &Context<'_>,
        input: TweetVoteInput,
    ) -> Result<TweetMetricsPayload> {
        // tweet_vote_resolver(ctx, input).await
        todo!()
    }
}

// ============================================================================
// Mutation Resolvers (internal functions)
// ============================================================================

/// Create a new tweet
pub async fn tweet_create_resolver(
    ctx: &Context<'_>,
    input: TweetCreateInput,
) -> Result<TweetPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;

    // Create tweet in MongoDB (generates post_id_hash)
    let view = app_state
        .mongo_service
        .tweets
        .create_tweet_with_author(user.clone(), input.content)
        .await?;

    // Create post on-chain if post_id_hash exists
    let mut onchain_signature: Option<String> = None;
    if let Some(post_id_hash_hex) = &view.tweet.post_id_hash {
        // Parse user's Solana wallet
        let user_wallet = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
            .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

        // Parse post_id_hash from hex to [u8; 32]
        let post_id_hash_bytes = hex::decode(post_id_hash_hex)
            .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

        if post_id_hash_bytes.len() != 32 {
            return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
        }

        let mut post_id_hash = [0u8; 32];
        post_id_hash.copy_from_slice(&post_id_hash_bytes);

        // Call create_post on-chain (backend signs transaction)
        match app_state
            .solana_service
            .create_post(user_wallet, post_id_hash, None)
            .await
        {
            Ok(signature) => {
                eprintln!("✅ Created post on-chain: {}", signature);
                onchain_signature = Some(signature.to_string());
            }
            Err(e) => {
                eprintln!("⚠️ Failed to create post on-chain: {}", e);
                // Don't fail the tweet creation if on-chain creation fails
                // The tweet is already in MongoDB, on-chain can be retried
            }
        }
    }

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
        onchain_signature,
    })
}

/// Like or unlike a tweet (toggle)
pub async fn tweet_like_resolver(
    ctx: &Context<'_>,
    id: ID,
    _idempotency_key: Option<String>,
) -> Result<TweetMetricsPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let object_id = parse_object_id(&id)?;

    let user = get_authenticated_user_from_ctx(ctx).await?;
    let user_id = user
        .id
        .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;

    let (like_count, smack_count, liked_by_viewer, energy) = app_state
        .mongo_service
        .tweets
        .toggle_like(user_id, object_id)
        .await?;

    Ok(TweetMetricsPayload {
        id,
        like_count,
        smack_count,
        liked_by_viewer,
        energy,
    })
}

/// Reply to a tweet
pub async fn tweet_reply_resolver(
    ctx: &Context<'_>,
    input: TweetReplyInput,
) -> Result<TweetPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;
    let replied_id = parse_object_id(&input.replied_to_id)?;

    // Get parent tweet to extract post_id_hash for parent PDA
    let parent_tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(replied_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Parent tweet not found"))?;

    let view = app_state
        .mongo_service
        .tweets
        .create_reply(user.clone(), input.content, replied_id)
        .await?;

    // Create post on-chain if post_id_hash exists and parent has post_id_hash
    let mut onchain_signature: Option<String> = None;
    if let Some(post_id_hash_hex) = &view.tweet.post_id_hash {
        if let Some(parent_post_id_hash_hex) = &parent_tweet.post_id_hash {
            // Parse user's Solana wallet
            let user_wallet = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
                .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

            // Parse reply post_id_hash from hex to [u8; 32]
            let post_id_hash_bytes = hex::decode(post_id_hash_hex)
                .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

            if post_id_hash_bytes.len() != 32 {
                return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
            }

            let mut post_id_hash = [0u8; 32];
            post_id_hash.copy_from_slice(&post_id_hash_bytes);

            // Parse parent post_id_hash and derive parent PDA
            let parent_post_id_hash_bytes = hex::decode(parent_post_id_hash_hex).map_err(|e| {
                async_graphql::Error::new(format!("Invalid parent post_id_hash: {}", e))
            })?;

            if parent_post_id_hash_bytes.len() != 32 {
                return Err(async_graphql::Error::new(
                    "parent post_id_hash must be 32 bytes",
                ));
            }

            let mut parent_post_id_hash = [0u8; 32];
            parent_post_id_hash.copy_from_slice(&parent_post_id_hash_bytes);

            // Derive parent post PDA
            let program_id = app_state.solana_service.opinions_market_program().id();
            let (parent_post_pda, _) = get_post_pda(&program_id, &parent_post_id_hash);

            // Call create_post on-chain with parent_post_pda
            match app_state
                .solana_service
                .create_post(user_wallet, post_id_hash, Some(parent_post_pda))
                .await
            {
                Ok(signature) => {
                    eprintln!("✅ Created reply post on-chain: {}", signature);
                    onchain_signature = Some(signature.to_string());
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to create reply post on-chain: {}", e);
                    // Don't fail the reply creation if on-chain creation fails
                    // The reply is already in MongoDB, on-chain can be retried
                }
            }
        }
    }

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
        onchain_signature,
    })
}

/// Quote a tweet
pub async fn tweet_quote_resolver(
    ctx: &Context<'_>,
    input: TweetQuoteInput,
) -> Result<TweetPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;
    let quoted_id = parse_object_id(&input.quoted_tweet_id)?;

    // Get quoted tweet to extract post_id_hash for parent PDA
    let quoted_tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(quoted_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Quoted tweet not found"))?;

    let view = app_state
        .mongo_service
        .tweets
        .create_quote(user.clone(), input.content, quoted_id)
        .await?;

    // Create post on-chain if post_id_hash exists and quoted tweet has post_id_hash
    let mut onchain_signature: Option<String> = None;
    if let Some(post_id_hash_hex) = &view.tweet.post_id_hash {
        if let Some(parent_post_id_hash_hex) = &quoted_tweet.post_id_hash {
            // Parse user's Solana wallet
            let user_wallet = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
                .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

            // Parse quote post_id_hash from hex to [u8; 32]
            let post_id_hash_bytes = hex::decode(post_id_hash_hex)
                .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

            if post_id_hash_bytes.len() != 32 {
                return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
            }

            let mut post_id_hash = [0u8; 32];
            post_id_hash.copy_from_slice(&post_id_hash_bytes);

            // Parse quoted tweet post_id_hash and derive parent PDA
            let parent_post_id_hash_bytes = hex::decode(parent_post_id_hash_hex).map_err(|e| {
                async_graphql::Error::new(format!("Invalid parent post_id_hash: {}", e))
            })?;

            if parent_post_id_hash_bytes.len() != 32 {
                return Err(async_graphql::Error::new(
                    "parent post_id_hash must be 32 bytes",
                ));
            }

            let mut parent_post_id_hash = [0u8; 32];
            parent_post_id_hash.copy_from_slice(&parent_post_id_hash_bytes);

            // Derive parent post PDA
            let program_id = app_state.solana_service.opinions_market_program().id();
            let (parent_post_pda, _) = get_post_pda(&program_id, &parent_post_id_hash);

            // Call create_post on-chain with parent_post_pda
            match app_state
                .solana_service
                .create_post(user_wallet, post_id_hash, Some(parent_post_pda))
                .await
            {
                Ok(signature) => {
                    eprintln!("✅ Created quote post on-chain: {}", signature);
                    onchain_signature = Some(signature.to_string());
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to create quote post on-chain: {}", e);
                    // Don't fail the quote creation if on-chain creation fails
                    // The quote is already in MongoDB, on-chain can be retried
                }
            }
        }
    }

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
        onchain_signature,
    })
}

/// Retweet a tweet
pub async fn tweet_retweet_resolver(ctx: &Context<'_>, id: ID) -> Result<TweetPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;
    let original_id = parse_object_id(&id)?;

    let view = app_state
        .mongo_service
        .tweets
        .create_retweet(user, original_id)
        .await?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
        onchain_signature: None, // Retweets don't create on-chain posts
    })
}

// Vote on a tweet (Pump or Smack)
// pub async fn tweet_vote_resolver(
//     ctx: &Context<'_>,
//     input: TweetVoteInput,
// ) -> Result<TweetMetricsPayload> {
//     let app_state = ctx.data::<Arc<AppState>>()?;
//     let user = get_authenticated_user_from_ctx(ctx).await?;
//     let tweet_id = parse_object_id(&input.tweet_id)?;

//     // Get tweet to extract post_id_hash
//     let tweet = app_state
//         .mongo_service
//         .tweets
//         .get_tweet_by_id(tweet_id)
//         .await?
//         .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

//     let post_id_hash_hex = tweet.post_id_hash
//         .ok_or_else(|| async_graphql::Error::new("Tweet does not have a post_id_hash (not an original tweet)"))?;

//     // Parse user's Solana wallet
//     let user_wallet = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
//         .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

//     // Parse post_id_hash from hex to [u8; 32]
//     let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
//         .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

//     if post_id_hash_bytes.len() != 32 {
//         return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
//     }

//     let mut post_id_hash = [0u8; 32];
//     post_id_hash.copy_from_slice(&post_id_hash_bytes);

//     // Parse side (pump = 0, smack = 1)
//     let side = match input.side.to_lowercase().as_str() {
//         "pump" => 0u8,
//         "smack" => 1u8,
//         _ => return Err(async_graphql::Error::new("side must be 'pump' or 'smack'")),
//     };

//     // Get token mint (default to BLING)
//     let token_mint = if let Some(mint_str) = input.token_mint {
//         solana_sdk::pubkey::Pubkey::from_str(&mint_str)
//             .map_err(|e| async_graphql::Error::new(format!("Invalid token_mint: {}", e)))?
//     } else {
//         *app_state.solana_service.get_bling_mint()
//     };

//     // Validate user has sufficient vault balance
//     let vault_balance = app_state.solana_service.get_user_vault_balance(&user_wallet, &token_mint)
//         .map_err(|e| async_graphql::Error::new(format!("Failed to check vault balance: {}", e)))?;

//     if vault_balance < input.votes {
//         return Err(async_graphql::Error::new(format!(
//             "Insufficient vault balance. You have {} but need {}",
//             vault_balance, input.votes
//         )));
//     }

//     // Check post state before voting (optional - can also check on-chain)
//     // For now, we'll let the on-chain program handle state validation

//     // Call vote_on_post on-chain (backend signs transaction)
//     match app_state.solana_service.vote_on_post(&user_wallet, post_id_hash, side, input.votes, &token_mint) {
//         Ok(signature) => {
//             eprintln!("✅ Voted on post on-chain: {}", signature);
//             // Sync post state after vote
//             if let Err(e) = app_state.post_sync_service.sync_post_state(&post_id_hash_hex).await {
//                 eprintln!("⚠️ Failed to sync post state after vote: {}", e);
//                 // Don't fail the vote if sync fails, but log it
//             }
//         }
//         Err(e) => {
//             // Map Solana errors to user-friendly messages
//             let error_message = match e {
//                 crate::solana::errors::SolanaError::InsufficientFunds => {
//                     "Insufficient vault balance".to_string()
//                 }
//                 crate::solana::errors::SolanaError::PostNotOpen => {
//                     "Post is not open for voting".to_string()
//                 }
//                 crate::solana::errors::SolanaError::PostExpired => {
//                     "Post has expired and can no longer be voted on".to_string()
//                 }
//                 crate::solana::errors::SolanaError::PostAlreadySettled => {
//                     "Post has already been settled".to_string()
//                 }
//                 crate::solana::errors::SolanaError::TransactionError(msg) => {
//                     format!("Transaction failed: {}", msg)
//                 }
//                 _ => format!("Failed to vote: {}", e),
//             };
//             return Err(async_graphql::Error::new(error_message));
//         }
//     }

//     // Return updated metrics (will be synced from chain state)
//     // For now, return current metrics
//     Ok(TweetMetricsPayload {
//         id: input.tweet_id,
//         like_count: tweet.metrics.likes,
//         smack_count: tweet.metrics.smacks,
//         liked_by_viewer: tweet.viewer_context.is_liked,
//         energy: tweet.energy_state.energy,
//     })
// }
