use axum::{Json, http::StatusCode};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::models::tweet::{Tweet, TweetView, TweetVisibility};

#[derive(Debug, Serialize, ToSchema)]
pub struct WallResponse {
    pub tweets: Vec<TweetView>,
    pub total: i64,
}

/// Wall composition algorithm - determines what tweets to show on a user's wall
pub async fn compose_wall(
    db: &Database,
    user_id: ObjectId,
    include_private: bool,
) -> Result<Vec<TweetView>, (StatusCode, Json<serde_json::Value>)> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

    // Verify user exists
    let _user = user_collection
        .find_one(doc! {"_id": user_id})
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

    let mut cursor = tweet_collection
        .find(doc! {"owner_id": user_id})
        .sort(doc! {"created_at": -1})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let mut tweets: Vec<Tweet> = Vec::new();
    while let Some(tweet) = cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })? {
        let is_private = matches!(tweet.visibility, TweetVisibility::Private);
        if include_private || !is_private {
            tweets.push(tweet);
        }
    }

    let enriched_tweets = crate::routes::tweet::enrich_tweets_with_references(
        tweets,
        &tweet_collection,
        &user_collection,
    )
    .await
    .map_err(|(status, Json(body))| (status, Json(body)))?;

    Ok(enriched_tweets)
}
