use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection, Database,
};
use serde::Serialize;
use futures::TryStreamExt;
use utoipa::ToSchema;

use crate::models::tweet::{CreateTweet, Tweet, TweetWithAuthor};

#[derive(Debug, Serialize, ToSchema)]
pub struct TweetListResponse {
    pub tweets: Vec<TweetWithAuthor>,
    pub total: i64,
}

/// Create a new tweet
#[utoipa::path(
    post,
    path = "/tweets",
    request_body = CreateTweet,
    responses(
        (status = 201, description = "Tweet created successfully", body = Tweet),
        (status = 400, description = "Invalid input data")
    ),
    tag = "tweets"
)]
pub async fn create_tweet(
    State(db): State<Database>,
    Json(payload): Json<CreateTweet>,
) -> Result<(StatusCode, Json<Tweet>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tweet> = db.collection("tweets");

    let now = mongodb::bson::DateTime::now();
    let tweet = Tweet {
        id: None,
        author_id: ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap(), // TODO: Get from auth
        content: payload.content,
        created_at: now,
        likes_count: 0,
        retweets_count: 0,
        replies_count: 0,
        is_liked: false,
        is_retweeted: false,
    };

    let result = collection.insert_one(&tweet).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create tweet"})),
        )
    })?;

    let mut created_tweet = tweet;
    created_tweet.id = Some(result.inserted_id.as_object_id().unwrap());

    Ok((StatusCode::CREATED, Json(created_tweet)))
}

/// Get tweet by ID
#[utoipa::path(
    get,
    path = "/tweets/{id}",
    params(
        ("id" = String, Path, description = "Tweet ID")
    ),
    responses(
        (status = 200, description = "Tweet found", body = TweetWithAuthor),
        (status = 404, description = "Tweet not found")
    ),
    tag = "tweets"
)]
pub async fn get_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<TweetWithAuthor>, (StatusCode, Json<serde_json::Value>)> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");
    
    let object_id = ObjectId::parse_str(&id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid tweet ID"})),
        )
    })?;

    let tweet = tweet_collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    match tweet {
        Some(tweet) => {
            let author = user_collection
                .find_one(doc! {"_id": tweet.author_id})
                .await
                .map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({"error": "Database error"})),
                    )
                })?;

            match author {
                Some(author) => {
                    let tweet_with_author = TweetWithAuthor {
                        id: tweet.id.unwrap(),
                        content: tweet.content,
                        created_at: tweet.created_at,
                        likes_count: tweet.likes_count,
                        retweets_count: tweet.retweets_count,
                        replies_count: tweet.replies_count,
                        is_liked: tweet.is_liked,
                        is_retweeted: tweet.is_retweeted,
                        author_id: tweet.author_id,
                        author_username: author.username,
                        author_display_name: author.display_name,
                        author_avatar_url: author.avatar_url,
                    };
                    Ok(Json(tweet_with_author))
                }
                None => Err((
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({"error": "Author not found"})),
                )),
            }
        }
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Tweet not found"})),
        )),
    }
}

/// Get all tweets (timeline)
#[utoipa::path(
    get,
    path = "/tweets",
    responses(
        (status = 200, description = "Tweets timeline", body = TweetListResponse)
    ),
    tag = "tweets"
)]
pub async fn get_tweets(
    State(db): State<Database>,
) -> Result<Json<TweetListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

    let cursor = tweet_collection
        .find(doc! {})
        .sort(doc! {"created_at": -1})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let tweets: Vec<Tweet> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    // Get all unique author IDs
    let author_ids: Vec<ObjectId> = tweets
        .iter()
        .map(|tweet| tweet.author_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    // Fetch all authors in one query
    let authors: Vec<crate::models::user::User> = user_collection
        .find(doc! {"_id": {"$in": author_ids}})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?
        .try_collect()
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    // Create author lookup map
    let author_map: std::collections::HashMap<ObjectId, &crate::models::user::User> = authors
        .iter()
        .map(|author| (author.id.unwrap(), author))
        .collect();

    let tweets_with_authors: Vec<TweetWithAuthor> = tweets
        .into_iter()
        .filter_map(|tweet| {
            author_map.get(&tweet.author_id).map(|author| TweetWithAuthor {
                id: tweet.id.unwrap(),
                content: tweet.content,
                created_at: tweet.created_at,
                likes_count: tweet.likes_count,
                retweets_count: tweet.retweets_count,
                replies_count: tweet.replies_count,
                is_liked: tweet.is_liked,
                is_retweeted: tweet.is_retweeted,
                author_id: tweet.author_id,
                author_username: author.username.clone(),
                author_display_name: author.display_name.clone(),
                author_avatar_url: author.avatar_url.clone(),
            })
        })
        .collect();

    let total = tweets_with_authors.len() as i64;

    Ok(Json(TweetListResponse {
        tweets: tweets_with_authors,
        total,
    }))
}

/// Like a tweet
#[utoipa::path(
    post,
    path = "/tweets/{id}/like",
    params(
        ("id" = String, Path, description = "Tweet ID")
    ),
    responses(
        (status = 200, description = "Tweet liked successfully")
    ),
    tag = "tweets"
)]
pub async fn like_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let object_id = ObjectId::parse_str(&id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid tweet ID"})),
        )
    })?;

    let result = collection
        .update_one(
            doc! {"_id": object_id},
            doc! {"$inc": {"likes_count": 1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    if result.matched_count == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Tweet not found"})),
        ));
    }

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({"message": "Tweet liked successfully"})),
    ))
}