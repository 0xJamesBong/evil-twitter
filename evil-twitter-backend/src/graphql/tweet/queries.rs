use async_graphql::{Context, ID, Object, Result};
use mongodb::bson::oid::ObjectId;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::tweet::types::{QuestionThreadNode, TweetConnection, TweetEdge, TweetNode, TweetThreadNode};

// Helper functions
fn parse_object_id(id: &ID) -> Result<ObjectId> {
    ObjectId::parse_str(id.as_str()).map_err(|_| async_graphql::Error::new("Invalid ObjectId"))
}

// ============================================================================
// TweetQuery Object
// ============================================================================

#[derive(Default)]
pub struct TweetQuery;

#[Object]
impl TweetQuery {
    /// Fetch a single tweet by ID
    async fn tweet(&self, ctx: &Context<'_>, id: ID) -> Result<Option<TweetNode>> {
        tweet_resolver(ctx, id).await
    }

    /// Hydrated tweet thread with parents and replies.
    async fn tweet_thread(&self, ctx: &Context<'_>, tweet_id: ID) -> Result<TweetThreadNode> {
        tweet_thread_resolver(ctx, tweet_id).await
    }

    /// Question thread with separated answers and comments.
    /// Returns QuestionThreadNode if tweet is a question, otherwise returns error.
    async fn question_thread(&self, ctx: &Context<'_>, question_id: ID) -> Result<QuestionThreadNode> {
        question_thread_resolver(ctx, question_id).await
    }

    /// Main timeline feed of tweets
    async fn timeline(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 20)] first: i32,
        #[graphql(default = "")] _after: String,
    ) -> Result<TweetConnection> {
        timeline_resolver(ctx, first, _after).await
    }

    /// Get all claimable rewards for the authenticated user
    async fn claimable_rewards(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<crate::graphql::tweet::types::ClaimableRewardNode>> {
        claimable_rewards_resolver(ctx).await
    }
}

// ============================================================================
// Query Resolvers (internal functions)
// ============================================================================

/// Fetch a single tweet by ID
pub async fn tweet_resolver(ctx: &Context<'_>, id: ID) -> Result<Option<TweetNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let object_id = parse_object_id(&id)?;

    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(object_id)
        .await?;

    if let Some(tweet) = tweet {
        let enriched = app_state
            .mongo_service
            .tweets
            .enrich_tweets(vec![tweet])
            .await?;
        Ok(enriched.into_iter().next().map(TweetNode::from))
    } else {
        Ok(None)
    }
}

/// Hydrated tweet thread with parents and replies.
pub async fn tweet_thread_resolver(ctx: &Context<'_>, tweet_id: ID) -> Result<TweetThreadNode> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let object_id = parse_object_id(&tweet_id)?;

    let response = app_state
        .mongo_service
        .tweets
        .get_tweet_thread(object_id)
        .await?;

    Ok(TweetThreadNode::from(response))
}

/// Question thread with separated answers and comments.
pub async fn question_thread_resolver(ctx: &Context<'_>, question_id: ID) -> Result<QuestionThreadNode> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let object_id = parse_object_id(&question_id)?;

    // First check if this is actually a question
    let tweet = app_state
        .mongo_service
        .tweets
        .get_tweet_by_id(object_id)
        .await?;

    let tweet = tweet.ok_or_else(|| async_graphql::Error::new("Question tweet not found"))?;

    // Check if tweet has post_id_hash and if it's a question
    // We'll verify this by checking postState, but for now we'll just try to assemble
    // The function will handle non-questions appropriately
    let response = app_state
        .mongo_service
        .tweets
        .get_question_thread(object_id)
        .await?;

    Ok(QuestionThreadNode::from(response))
}

/// Main timeline feed of tweets
pub async fn timeline_resolver(
    ctx: &Context<'_>,
    first: i32,
    _after: String, // Reserved for future cursor pagination
) -> Result<TweetConnection> {
    let limit = first.clamp(1, 50);
    let app_state = ctx.data::<Arc<AppState>>()?;

    let enriched = app_state
        .mongo_service
        .tweets
        .get_timeline(i64::from(limit))
        .await?;

    let edges = enriched
        .into_iter()
        .filter_map(|view| {
            view.tweet.id.map(|id| TweetEdge {
                cursor: ID::from(id.to_hex()),
                node: TweetNode::from(view),
            })
        })
        .collect::<Vec<_>>();

    Ok(TweetConnection {
        edges: edges.clone(),
        total_count: edges.len() as i64,
    })
}

/// Get all claimable rewards for the authenticated user
pub async fn claimable_rewards_resolver(
    ctx: &Context<'_>,
) -> Result<Vec<crate::graphql::tweet::types::ClaimableRewardNode>> {
    use crate::graphql::tweet::types::ClaimableRewardNode;
    use crate::models::post_state::PostState;
    use axum::http::HeaderMap;
    use futures::TryStreamExt;
    use mongodb::bson::doc;

    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    let user = crate::utils::auth::get_authenticated_user(
        &app_state.mongo_service,
        &app_state.privy_service,
        headers,
    )
    .await
    .map_err(|(status, json)| {
        let error_msg = json
            .0
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Authentication failed");
        async_graphql::Error::new(format!("{} (status {})", error_msg, status))
    })?;

    let user_wallet = Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

    // Get all settled posts from MongoDB (limit to recent 200 to avoid performance issues)
    let post_states_collection = app_state
        .mongo_service
        .db()
        .collection::<PostState>(PostState::COLLECTION_NAME);

    let mut settled_posts = post_states_collection
        .find(doc! {
            "state": "Settled"
        })
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to query settled posts: {}", e)))?
        .try_collect::<Vec<_>>()
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to collect settled posts: {}", e))
        })?;

    // Sort by end_time descending (most recent first) and limit to 200
    settled_posts.sort_by(|a, b| b.end_time.cmp(&a.end_time));
    settled_posts.truncate(200);

    // Get token mints to check (BLING and USDC)
    let bling_mint = *app_state.solana_service.get_bling_mint();
    let mut token_mints = vec![bling_mint];

    // Add USDC if configured
    if let Ok(usdc_mint_str) = std::env::var("USDC_MINT") {
        if let Ok(usdc_mint) = Pubkey::from_str(&usdc_mint_str) {
            token_mints.push(usdc_mint);
        }
    }

    let mut claimable_rewards = Vec::new();

    // For each settled post, check if user has claimable rewards
    for post_state in settled_posts {
        // Parse post_id_hash
        let post_id_hash_bytes = match hex::decode(&post_state.post_id_hash) {
            Ok(bytes) if bytes.len() == 32 => {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&bytes);
                arr
            }
            _ => continue, // Skip invalid post_id_hash
        };

        // Get associated tweet
        let tweet_collection = app_state.mongo_service.tweet_collection();
        let tweet = match tweet_collection
            .find_one(doc! { "post_id_hash": &post_state.post_id_hash })
            .await
        {
            Ok(Some(tweet)) => tweet,
            Ok(None) => continue, // No tweet found for this post
            Err(_) => continue,   // Skip on error
        };

        let tweet_id = tweet
            .id
            .map(|id| id.to_hex())
            .unwrap_or_else(|| "unknown".to_string());

        // Check claimable rewards for each token mint
        for token_mint in &token_mints {
            match app_state
                .solana_service
                .get_claimable_reward(&user_wallet, &post_id_hash_bytes, token_mint)
                .await
            {
                Ok(Some(amount)) if amount > 0 => {
                    claimable_rewards.push(ClaimableRewardNode {
                        tweet_id: async_graphql::ID::from(tweet_id.clone()),
                        post_id_hash: post_state.post_id_hash.clone(),
                        token_mint: token_mint.to_string(),
                        amount: amount.to_string(),
                        reward_type: "voter".to_string(), // For now, only voter rewards
                    });
                }
                Ok(_) => {}  // No claimable reward or already claimed
                Err(_) => {} // Skip on error
            }
        }
    }

    Ok(claimable_rewards)
}
