use async_graphql::{Context, ID, InputObject, Object, Result, SimpleObject};
use axum::http::HeaderMap;
use mongodb::bson::oid::ObjectId;

use std::sync::Arc;

use crate::{
    app_state::AppState, graphql::tweet::types::TweetNode, models::user::User,
    utils::auth::get_authenticated_user,
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

// ============================================================================
// Payload Types
// ============================================================================

#[derive(SimpleObject)]
pub struct TweetPayload {
    pub tweet: TweetNode,
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
    get_authenticated_user(app_state.mongo_service.db(), headers)
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

    let view = app_state
        .mongo_service
        .tweets
        .create_tweet_with_author(user, input.content)
        .await?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
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

    let view = app_state
        .mongo_service
        .tweets
        .create_reply(user, input.content, replied_id)
        .await?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
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

    let view = app_state
        .mongo_service
        .tweets
        .create_quote(user, input.content, quoted_id)
        .await?;

    Ok(TweetPayload {
        tweet: TweetNode::from(view),
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
    })
}
