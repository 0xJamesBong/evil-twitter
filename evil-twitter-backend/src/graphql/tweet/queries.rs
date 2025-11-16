use async_graphql::{Context, ID, Object, Result};
use mongodb::bson::oid::ObjectId;

use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::tweet::types::{TweetConnection, TweetEdge, TweetNode, TweetThreadNode};

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

    /// Main timeline feed of tweets
    async fn timeline(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 20)] first: i32,
        #[graphql(default = "")] _after: String,
    ) -> Result<TweetConnection> {
        timeline_resolver(ctx, first, _after).await
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
