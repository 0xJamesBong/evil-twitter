use async_graphql::{Context, ID, InputObject, Object, Result, SimpleObject};
use axum::http::HeaderMap;
use mongodb::bson::oid::ObjectId;
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

use hex;
use opinions_market::states::Side;
use solana_sdk::pubkey::Pubkey;
use std::sync::Arc;

use crate::{
    app_state::{AppState, VoteBufferKey, VoteBufferValue},
    graphql::tweet::types::TweetNode,
    models::user::User,
    solana::get_post_pda,
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
pub struct TweetQuestionInput {
    pub content: String,
}

#[derive(InputObject)]
pub struct TweetAnswerInput {
    pub content: String,
    pub question_tweet_id: ID,
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
    pub side: String,               // "pump" or "smack"
    pub token_mint: Option<String>, // Optional, defaults to BLING
}

#[derive(InputObject)]
pub struct SettlePostInput {
    pub tweet_id: ID,
    // token_mint removed - will loop through all tokens for the post
}

#[derive(InputObject)]
pub struct DistributeRewardInput {
    pub tweet_id: ID,
    pub token_mint: String, // Token mint pubkey as string
}

#[derive(InputObject)]
pub struct ClaimRewardInput {
    pub tweet_id: ID,
    pub token_mint: String, // Token mint pubkey as string
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

#[derive(SimpleObject)]
pub struct SettlePostPayload {
    pub signature: String,
    pub post_state: Option<crate::graphql::tweet::types::PostStateNode>,
}

#[derive(SimpleObject)]
pub struct DistributeRewardPayload {
    pub signature: String,
}

#[derive(SimpleObject)]
pub struct ClaimRewardPayload {
    pub signature: String,
    pub amount: String, // Amount claimed as string (in token units)
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

    /// Create a question
    async fn tweet_question(
        &self,
        ctx: &Context<'_>,
        input: TweetQuestionInput,
    ) -> Result<TweetPayload> {
        tweet_question_resolver(ctx, input).await
    }

    /// Create an answer to a question
    async fn tweet_answer(
        &self,
        ctx: &Context<'_>,
        input: TweetAnswerInput,
    ) -> Result<TweetPayload> {
        tweet_answer_resolver(ctx, input).await
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
        tweet_vote_resolver(ctx, input).await
    }

    /// Settle a post for a specific token mint (freezes math, no transfers)
    async fn settle_post(
        &self,
        ctx: &Context<'_>,
        input: SettlePostInput,
    ) -> Result<SettlePostPayload> {
        settle_post_resolver(ctx, input).await
    }

    /// Distribute creator reward from frozen settlement
    async fn distribute_creator_reward(
        &self,
        ctx: &Context<'_>,
        input: DistributeRewardInput,
    ) -> Result<DistributeRewardPayload> {
        distribute_creator_reward_resolver(ctx, input).await
    }

    /// Distribute protocol fee from frozen settlement
    async fn distribute_protocol_fee(
        &self,
        ctx: &Context<'_>,
        input: DistributeRewardInput,
    ) -> Result<DistributeRewardPayload> {
        distribute_protocol_fee_resolver(ctx, input).await
    }

    /// Distribute parent post share from frozen settlement
    async fn distribute_parent_post_share(
        &self,
        ctx: &Context<'_>,
        input: DistributeRewardInput,
    ) -> Result<DistributeRewardPayload> {
        distribute_parent_post_share_resolver(ctx, input).await
    }

    /// Claim voter reward for a settled post
    async fn claim_post_reward(
        &self,
        ctx: &Context<'_>,
        input: ClaimRewardInput,
    ) -> Result<ClaimRewardPayload> {
        claim_post_reward_resolver(ctx, input).await
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

        eprintln!("📝 tweet_create: Creating ORIGINAL POST (no parent)");

        // Call create_post on-chain (backend signs transaction)
        match app_state
            .solana_service
            .create_post(user_wallet, post_id_hash, None)
            .await
        {
            Ok(signature) => {
                eprintln!("📝 ✅ Created original post on-chain: {}", signature);
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

            eprintln!(
                "🌳 tweet_reply: Creating CHILD POST (REPLY) - Parent Post PDA: {}",
                parent_post_pda
            );

            // Call create_post on-chain with parent_post_pda
            match app_state
                .solana_service
                .create_post(user_wallet, post_id_hash, Some(parent_post_pda))
                .await
            {
                Ok(signature) => {
                    eprintln!(
                        "🌳 ✅ Created reply post (CHILD POST) on-chain: {}",
                        signature
                    );
                    onchain_signature = Some(signature.to_string());
                }
                Err(e) => {
                    eprintln!(
                        "🌳 ⚠️ Failed to create reply post (CHILD POST) on-chain: {}",
                        e
                    );
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

            eprintln!(
                "🌳 tweet_quote: Creating CHILD POST (QUOTE) - Parent Post PDA: {}",
                parent_post_pda
            );

            // Call create_post on-chain with parent_post_pda
            match app_state
                .solana_service
                .create_post(user_wallet, post_id_hash, Some(parent_post_pda))
                .await
            {
                Ok(signature) => {
                    eprintln!(
                        "🌳 ✅ Created quote post (CHILD POST) on-chain: {}",
                        signature
                    );
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

/// Create a question
pub async fn tweet_question_resolver(
    ctx: &Context<'_>,
    input: TweetQuestionInput,
) -> Result<TweetPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;

    // Create tweet in MongoDB (generates post_id_hash)
    let view = app_state
        .mongo_service
        .tweets
        .create_tweet_with_author(user.clone(), input.content)
        .await?;

    // Create question on-chain if post_id_hash exists
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

        eprintln!("❓ tweet_question: Creating QUESTION POST");

        // Call create_question on-chain (backend signs transaction)
        match app_state
            .solana_service
            .create_question(user_wallet, post_id_hash)
            .await
        {
            Ok(signature) => {
                eprintln!("❓ ✅ Created question post on-chain: {}", signature);
                onchain_signature = Some(signature.to_string());
            }
            Err(e) => {
                eprintln!("⚠️ Failed to create question post on-chain: {}", e);
                // Don't fail the question creation if on-chain creation fails
                // The question is already in MongoDB, on-chain can be retried
            }
        }
    }

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
        onchain_signature,
    })
}

/// Create an answer to a question
pub async fn tweet_answer_resolver(
    ctx: &Context<'_>,
    input: TweetAnswerInput,
) -> Result<TweetPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;
    let question_id = parse_object_id(&input.question_tweet_id)?;

    // Get question tweet to extract post_id_hash for question PDA
    let question_tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(question_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Question tweet not found"))?;

    // Create answer tweet in MongoDB (generates post_id_hash)
    let view = app_state
        .mongo_service
        .tweets
        .create_tweet_with_author(user.clone(), input.content)
        .await?;

    // Create answer on-chain if post_id_hash exists and question has post_id_hash
    let mut onchain_signature: Option<String> = None;
    if let Some(answer_post_id_hash_hex) = &view.tweet.post_id_hash {
        if let Some(question_post_id_hash_hex) = &question_tweet.post_id_hash {
            // Parse user's Solana wallet
            let user_wallet = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
                .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

            // Parse answer post_id_hash from hex to [u8; 32]
            let answer_post_id_hash_bytes = hex::decode(answer_post_id_hash_hex)
                .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

            if answer_post_id_hash_bytes.len() != 32 {
                return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
            }

            let mut answer_post_id_hash = [0u8; 32];
            answer_post_id_hash.copy_from_slice(&answer_post_id_hash_bytes);

            // Parse question post_id_hash
            let question_post_id_hash_bytes =
                hex::decode(question_post_id_hash_hex).map_err(|e| {
                    async_graphql::Error::new(format!("Invalid question post_id_hash: {}", e))
                })?;

            if question_post_id_hash_bytes.len() != 32 {
                return Err(async_graphql::Error::new(
                    "question post_id_hash must be 32 bytes",
                ));
            }

            let mut question_post_id_hash = [0u8; 32];
            question_post_id_hash.copy_from_slice(&question_post_id_hash_bytes);

            eprintln!(
                "💬 tweet_answer: Creating ANSWER POST - Question Post ID Hash: {:?}",
                hex::encode(question_post_id_hash)
            );

            // Call create_answer on-chain
            match app_state
                .solana_service
                .create_answer(user_wallet, answer_post_id_hash, question_post_id_hash)
                .await
            {
                Ok(signature) => {
                    eprintln!("💬 ✅ Created answer post on-chain: {}", signature);
                    onchain_signature = Some(signature.to_string());
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to create answer post on-chain: {}", e);
                    // Don't fail the answer creation if on-chain creation fails
                    // The answer is already in MongoDB, on-chain can be retried
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
pub async fn tweet_vote_resolver(
    ctx: &Context<'_>,
    input: TweetVoteInput,
) -> Result<TweetMetricsPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;
    let tweet_id = parse_object_id(&input.tweet_id)?;

    // Get tweet to extract post_id_hash
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(tweet_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let post_id_hash_hex = tweet.post_id_hash.ok_or_else(|| {
        async_graphql::Error::new("Tweet does not have a post_id_hash (not an original tweet)")
    })?;

    // Parse user's Solana wallet
    let user_wallet = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

    // Parse post_id_hash from hex to [u8; 32]
    let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
        .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

    if post_id_hash_bytes.len() != 32 {
        return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    // Parse side (pump = 0, smack = 1)
    let side = match input.side.to_lowercase().as_str() {
        "pump" => Side::Pump,
        "smack" => Side::Smack,
        _ => return Err(async_graphql::Error::new("side must be 'pump' or 'smack'")),
    };

    // Get token mint: use input.token_mint if provided, otherwise use user's default_payment_token, otherwise default to BLING
    let token_mint = if let Some(mint_str) = input.token_mint {
        // Explicit token mint override from input
        solana_sdk::pubkey::Pubkey::from_str(&mint_str)
            .map_err(|e| async_graphql::Error::new(format!("Invalid token_mint: {}", e)))?
    } else if let Some(ref default_mint_str) = user.default_payment_token {
        // Use user's default payment token
        solana_sdk::pubkey::Pubkey::from_str(default_mint_str).map_err(|e| {
            async_graphql::Error::new(format!("Invalid default_payment_token: {}", e))
        })?
    } else {
        // Default to BLING if no default is set
        *app_state.solana_service.get_bling_mint()
    };

    // Write vote to buffer (will be batched and sent by background flush task)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| async_graphql::Error::new(format!("Failed to get timestamp: {}", e)))?
        .as_secs() as i64;

    let buffer_key = VoteBufferKey {
        user: user_wallet,
        post_id_hash,
        side,
        token_mint,
    };

    // Increment accumulated votes in buffer
    let mut buffer = app_state
        .vote_buffer
        .lock()
        .map_err(|e| async_graphql::Error::new(format!("Failed to lock vote buffer: {}", e)))?;

    buffer
        .entry(buffer_key)
        .and_modify(|v| {
            v.accumulated_votes += 1;
            v.last_click_ts = now;
        })
        .or_insert_with(|| VoteBufferValue {
            accumulated_votes: 1,
            last_click_ts: now,
        });

    // Vote is queued, return immediate success
    // The background flush task will handle the actual Solana transaction

    // Return updated metrics (will be synced from chain state)
    // For now, return current metrics
    Ok(TweetMetricsPayload {
        id: input.tweet_id,
        like_count: tweet.metrics.likes,
        smack_count: tweet.metrics.smacks,
        liked_by_viewer: tweet.viewer_context.is_liked,
        energy: tweet.energy_state.energy,
    })
}

/// Settle a post for all token mints (loops through all tokens and chains instructions)
pub async fn settle_post_resolver(
    ctx: &Context<'_>,
    input: SettlePostInput,
) -> Result<SettlePostPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    // Get tweet to extract post_id_hash
    let tweet_id = parse_object_id(&input.tweet_id)?;
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(tweet_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let post_id_hash_hex = tweet
        .post_id_hash
        .ok_or_else(|| async_graphql::Error::new("Tweet does not have a post_id_hash"))?;

    // Parse post_id_hash from hex to [u8; 32]
    let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
        .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

    if post_id_hash_bytes.len() != 32 {
        return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    // Get all token mints
    let bling_mint = *app_state.solana_service.get_bling_mint();
    let usdc_mint_str = std::env::var("USDC_MINT").ok();
    let stablecoin_mint_str = std::env::var("STABLECOIN_MINT").ok();

    // Collect all token mints to check
    let mut token_mints: Vec<Pubkey> = vec![bling_mint];

    if let Some(ref usdc_mint_str) = usdc_mint_str {
        if let Ok(usdc_mint) = Pubkey::from_str(usdc_mint_str) {
            token_mints.push(usdc_mint);
        }
    }

    if let Some(ref stablecoin_mint_str) = stablecoin_mint_str {
        if let Ok(stablecoin_mint) = Pubkey::from_str(stablecoin_mint_str) {
            token_mints.push(stablecoin_mint);
        }
    }

    // Fetch post account once to check if it's a child post (before the loop)
    let program = app_state.solana_service.opinions_market_program();
    let program_id = program.id();
    let (post_pda, _) = crate::solana::get_post_pda(&program_id, &post_id_hash);
    
    let post_account = program
        .account::<opinions_market::states::PostAccount>(post_pda)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to fetch post account: {}", e))
        })?;

    // Check if post is a child post (not root) - only child posts can have parent distribution
    let is_child_post = matches!(
        post_account.relation,
        opinions_market::states::PostRelation::Reply { .. }
            | opinions_market::states::PostRelation::Quote { .. }
            | opinions_market::states::PostRelation::AnswerTo { .. }
    );

    // Collect all instructions to chain
    let mut all_instructions: Vec<solana_sdk::instruction::Instruction> = Vec::new();

    // Loop through each token mint and build instructions
    for token_mint in &token_mints {
        // Check pot balance - skip if zero
        let pot_balance = app_state
            .solana_service
            .get_post_pot_balance(&post_id_hash, token_mint)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get pot balance: {}", e)))?;

        if pot_balance == 0 {
            eprintln!("  ⏭️  Skipping token {} - zero balance", token_mint);
            continue;
        }

        eprintln!(
            "  🔧 Processing token {} with balance {}",
            token_mint, pot_balance
        );

        // Build settle instruction
        let settle_ixs = app_state
            .solana_service
            .build_settle_post_instruction(post_id_hash, token_mint)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!(
                    "Failed to build settle instruction for token {}: {}",
                    token_mint, e
                ))
            })?;
        all_instructions.extend(settle_ixs);

        // Build distribute creator reward instruction
        let creator_ixs = app_state
            .solana_service
            .build_distribute_creator_reward_instruction(post_id_hash, token_mint)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!(
                    "Failed to build distribute creator reward instruction for token {}: {}",
                    token_mint, e
                ))
            })?;
        all_instructions.extend(creator_ixs);

        // Build distribute protocol fee instruction
        let protocol_ixs = app_state
            .solana_service
            .build_distribute_protocol_fee_instruction(post_id_hash, token_mint)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!(
                    "Failed to build distribute protocol fee instruction for token {}: {}",
                    token_mint, e
                ))
            })?;
        all_instructions.extend(protocol_ixs);

        // Only build parent distribution instruction if post is a child (not root)
        // The instruction itself will check mother_fee > 0 and return early if not
        if is_child_post {
            // Build distribute parent post share instruction
            // This will return None if post is root (double-check), or build instruction
            // The instruction will check mother_fee > 0 internally and return early if 0
            let parent_ixs_opt = app_state
                .solana_service
                .build_distribute_parent_post_share_instruction(post_id_hash, token_mint)
                .await
                .map_err(|e| {
                    async_graphql::Error::new(format!(
                        "Failed to build distribute parent post share instruction for token {}: {}",
                        token_mint, e
                    ))
                })?;

            if let Some(parent_ixs) = parent_ixs_opt {
                all_instructions.extend(parent_ixs);
            }
        }
    }

    if all_instructions.is_empty() {
        return Err(async_graphql::Error::new(
            "No tokens with non-zero balances to settle",
        ));
    }

    eprintln!(
        "  📦 Built {} total instructions for settlement",
        all_instructions.len()
    );

    // Build and send transaction with all chained instructions
    let tx = app_state
        .solana_service
        .build_partial_signed_tx(all_instructions)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to build transaction: {}", e)))?;

    let signature = app_state
        .solana_service
        .send_signed_tx(&tx)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to send transaction: {}", e)))?;

    eprintln!(
        "  ✅ Settlement transaction confirmed! Signature: {}",
        signature
    );

    // Get post state through the resolver (it's a GraphQL field, not a direct method)
    // We'll return None for now and let the client refetch if needed
    let post_state = None;

    Ok(SettlePostPayload {
        signature: signature.to_string(),
        post_state,
    })
}

/// Distribute creator reward
pub async fn distribute_creator_reward_resolver(
    ctx: &Context<'_>,
    input: DistributeRewardInput,
) -> Result<DistributeRewardPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    let tweet_id = parse_object_id(&input.tweet_id)?;
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(tweet_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let post_id_hash_hex = tweet
        .post_id_hash
        .ok_or_else(|| async_graphql::Error::new("Tweet does not have a post_id_hash"))?;

    let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
        .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

    if post_id_hash_bytes.len() != 32 {
        return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    let token_mint = Pubkey::from_str(&input.token_mint)
        .map_err(|e| async_graphql::Error::new(format!("Invalid token_mint: {}", e)))?;

    let signature = app_state
        .solana_service
        .distribute_creator_reward(post_id_hash, &token_mint)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to distribute creator reward: {}", e))
        })?;

    Ok(DistributeRewardPayload {
        signature: signature.to_string(),
    })
}

/// Distribute protocol fee
pub async fn distribute_protocol_fee_resolver(
    ctx: &Context<'_>,
    input: DistributeRewardInput,
) -> Result<DistributeRewardPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    let tweet_id = parse_object_id(&input.tweet_id)?;
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(tweet_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let post_id_hash_hex = tweet
        .post_id_hash
        .ok_or_else(|| async_graphql::Error::new("Tweet does not have a post_id_hash"))?;

    let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
        .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

    if post_id_hash_bytes.len() != 32 {
        return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    let token_mint = Pubkey::from_str(&input.token_mint)
        .map_err(|e| async_graphql::Error::new(format!("Invalid token_mint: {}", e)))?;

    let signature = app_state
        .solana_service
        .distribute_protocol_fee(post_id_hash, &token_mint)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to distribute protocol fee: {}", e))
        })?;

    Ok(DistributeRewardPayload {
        signature: signature.to_string(),
    })
}

/// Distribute parent post share
pub async fn distribute_parent_post_share_resolver(
    ctx: &Context<'_>,
    input: DistributeRewardInput,
) -> Result<DistributeRewardPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    let tweet_id = parse_object_id(&input.tweet_id)?;
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(tweet_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let post_id_hash_hex = tweet
        .post_id_hash
        .ok_or_else(|| async_graphql::Error::new("Tweet does not have a post_id_hash"))?;

    let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
        .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

    if post_id_hash_bytes.len() != 32 {
        return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    let token_mint = Pubkey::from_str(&input.token_mint)
        .map_err(|e| async_graphql::Error::new(format!("Invalid token_mint: {}", e)))?;

    let signature = app_state
        .solana_service
        .distribute_parent_post_share(post_id_hash, &token_mint)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to distribute parent post share: {}", e))
        })?;

    Ok(DistributeRewardPayload {
        signature: signature.to_string(),
    })
}

/// Claim voter reward
pub async fn claim_post_reward_resolver(
    ctx: &Context<'_>,
    input: ClaimRewardInput,
) -> Result<ClaimRewardPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user = get_authenticated_user_from_ctx(ctx).await?;

    let tweet_id = parse_object_id(&input.tweet_id)?;
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(tweet_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

    let post_id_hash_hex = tweet
        .post_id_hash
        .ok_or_else(|| async_graphql::Error::new("Tweet does not have a post_id_hash"))?;

    let post_id_hash_bytes = hex::decode(&post_id_hash_hex)
        .map_err(|e| async_graphql::Error::new(format!("Invalid post_id_hash: {}", e)))?;

    if post_id_hash_bytes.len() != 32 {
        return Err(async_graphql::Error::new("post_id_hash must be 32 bytes"));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    let token_mint = Pubkey::from_str(&input.token_mint)
        .map_err(|e| async_graphql::Error::new(format!("Invalid token_mint: {}", e)))?;

    let user_wallet = Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

    // Check claimable amount first
    let claimable_amount = app_state
        .solana_service
        .get_claimable_reward(&user_wallet, &post_id_hash, &token_mint)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to check claimable reward: {}", e))
        })?;

    let claimable_amount = claimable_amount
        .ok_or_else(|| async_graphql::Error::new("No reward available to claim"))?;

    // Get token decimals for formatting
    // USDC and stablecoin have 6 decimals, BLING has 9 decimals
    let token_decimals = if &token_mint == app_state.solana_service.get_bling_mint() {
        9
    } else {
        6 // USDC and stablecoin have 6 decimals
    };

    // Format amount as string
    let amount_string = format!(
        "{}",
        claimable_amount as f64 / 10_f64.powi(token_decimals as i32)
    );

    // Call claim_post_reward on-chain (uses session authority, backend signs)
    let signature = app_state
        .solana_service
        .claim_post_reward(&user_wallet, post_id_hash, &token_mint)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to claim reward: {}", e)))?;

    Ok(ClaimRewardPayload {
        signature: signature.to_string(),
        amount: amount_string,
    })
}
