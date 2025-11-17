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

use crate::models::tweet::{Tweet, TweetView};

#[derive(Debug, Serialize, ToSchema)]
pub struct WallResponse {
    pub tweets: Vec<TweetView>,
    pub total: i64,
}

/// Wall composition algorithm - determines what tweets to show on a user's wall
pub async fn compose_wall(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Vec<TweetView>, (StatusCode, Json<serde_json::Value>)> {
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

    // Wall composition algorithm - return ALL tweets
    // Get all tweets without sorting first to test
    println!("Wall: Starting to fetch tweets for user: {}", user_id);

    let all_tweets_cursor = tweet_collection.find(doc! {}).await.map_err(|e| {
        println!("Wall: Database error during find: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let all_tweets: Vec<Tweet> = all_tweets_cursor.try_collect().await.map_err(|e| {
        println!("Wall: Database error during collect: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    println!("Wall: Found {} tweets", all_tweets.len());

    // Enrich with quoted/replied tweets
    let enriched_tweets = crate::utils::tweet::enrich_tweets_with_references(
        all_tweets,
        &tweet_collection,
        &user_collection,
        &db,
    )
    .await?;

    Ok(enriched_tweets)
}
