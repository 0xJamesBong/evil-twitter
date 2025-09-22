use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::models::tweet::Tweet;

#[derive(Debug, Serialize, ToSchema)]
pub struct WallResponse {
    pub tweets: Vec<Tweet>,
    pub total: i64,
}

/// Wall composition algorithm - determines what tweets to show on a user's wall
pub async fn compose_wall(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Json<WallResponse>, (StatusCode, Json<serde_json::Value>)> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

    // Parse user ID
    let user_object_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // Verify user exists
    let _user = user_collection
        .find_one(doc! {"_id": user_object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "User not found"})),
            )
        })?;

    // Wall composition algorithm:
    // 1. User's own tweets (original, retweets, quotes, replies)
    // 2. Tweets from users they follow
    // 3. Tweets that were retweeted by users they follow
    // 4. Tweets that were quoted by users they follow
    // 5. Tweets that were replied to by users they follow

    // For now, let's start with a simple implementation:
    // Get all tweets where the user is the author (their own activity)
    let user_tweets_cursor = tweet_collection
        .find(doc! {"author_id": user_object_id})
        .sort(doc! {"created_at": -1})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let user_tweets: Vec<Tweet> = user_tweets_cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    // TODO: Add following logic here
    // For now, we'll just return the user's own tweets
    // Later we can add:
    // - Get users they follow
    // - Get tweets from followed users
    // - Get retweets/quotes/replies from followed users
    // - Apply ranking algorithm (recency, engagement, etc.)

    let total = user_tweets.len() as i64;

    Ok(Json(WallResponse {
        tweets: user_tweets,
        total,
    }))
}
