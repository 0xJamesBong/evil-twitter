use async_graphql::{Context, ID, Object, Result};
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};

use crate::graphql::GraphQLState;
use crate::graphql::tweet::types::{TweetConnection, TweetEdge, TweetNode, TweetThreadNode};
use crate::models::{tweet::Tweet, user::User};
use crate::utils::auth::get_authenticated_user;
use crate::utils::tweet::{ApiError, assemble_thread_response, enrich_tweets_with_references};
use axum::Json;
use mongodb::bson::oid::ObjectId;

// Helper functions
fn parse_object_id(id: &ID) -> Result<ObjectId> {
    ObjectId::parse_str(id.as_str()).map_err(|_| async_graphql::Error::new("Invalid ObjectId"))
}

fn map_mongo_error(err: mongodb::error::Error) -> async_graphql::Error {
    async_graphql::Error::new(err.to_string())
}

fn map_api_error(err: ApiError) -> async_graphql::Error {
    let (status, Json(body)) = err;
    let message = body
        .get("error")
        .and_then(|value| value.as_str())
        .or_else(|| body.get("message").and_then(|value| value.as_str()))
        .unwrap_or("Unknown error");
    async_graphql::Error::new(format!("{message} (status {status})"))
}

fn api_error_to_graphql(err: ApiError) -> async_graphql::Error {
    map_api_error(err)
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
    let state = ctx.data::<GraphQLState>()?;
    let object_id = parse_object_id(&id)?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let tweet = tweet_collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(map_mongo_error)?;

    if let Some(tweet) = tweet {
        let enriched =
            enrich_tweets_with_references(vec![tweet], &tweet_collection, &user_collection)
                .await
                .map_err(map_api_error)?;

        Ok(enriched.into_iter().next().map(TweetNode::from))
    } else {
        Ok(None)
    }
}

/// Hydrated tweet thread with parents and replies.
pub async fn tweet_thread_resolver(ctx: &Context<'_>, tweet_id: ID) -> Result<TweetThreadNode> {
    let state = ctx.data::<GraphQLState>()?;
    let object_id = parse_object_id(&tweet_id)?;

    let response = assemble_thread_response(&state.db, object_id)
        .await
        .map_err(api_error_to_graphql)?;

    Ok(TweetThreadNode::from(response))
}

/// Main timeline feed of tweets
pub async fn timeline_resolver(
    ctx: &Context<'_>,
    first: i32,
    _after: String, // Reserved for future cursor pagination
) -> Result<TweetConnection> {
    let limit = first.clamp(1, 50);
    let state = ctx.data::<GraphQLState>()?;
    let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
    let user_collection: Collection<User> = state.db.collection("users");

    let mut cursor = tweet_collection
        .find(doc! {})
        .sort(doc! {"created_at": -1})
        .limit(i64::from(limit))
        .await
        .map_err(map_mongo_error)?;

    let mut tweets = Vec::new();
    while let Some(tweet) = cursor.try_next().await.map_err(map_mongo_error)? {
        tweets.push(tweet);
    }

    let enriched = enrich_tweets_with_references(tweets, &tweet_collection, &user_collection)
        .await
        .map_err(map_api_error)?;

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
