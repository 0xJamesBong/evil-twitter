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

use crate::models::tweet::{CreateTweet, Tweet};

#[derive(Debug, Serialize, ToSchema)]
pub struct TweetListResponse {
    pub tweets: Vec<Tweet>,
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
    headers: axum::http::HeaderMap,
    Json(payload): Json<CreateTweet>,
) -> Result<(StatusCode, Json<Tweet>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

    // Extract Supabase user ID from Authorization header
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Missing authorization header"})),
            )
        })?;

    // Extract user ID from JWT token (simplified - in production you'd verify the JWT)
    let supabase_id = if auth_header.starts_with("Bearer ") {
        // For now, we'll use a placeholder - in production you'd decode the JWT
        // and extract the user ID from the token payload
        "87cda46d-edb6-42ec-8bb1-b580d1ca2c6e" // Placeholder for testing
    } else {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid authorization format"})),
        ));
    };

    let now = mongodb::bson::DateTime::now();
    let id = Some(ObjectId::new());

    // Find user by supabase_id
    let user = user_collection
        .find_one(doc! {"supabase_id": supabase_id})
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
    let tweet = Tweet {
        id,
        author_id: user.id.unwrap(),
        content: payload.content,
        created_at: now,
        likes_count: 0,
        retweets_count: 0,
        replies_count: 0,
        is_liked: false,
        is_retweeted: false,
        author_username: Some(user.username),
        author_display_name: Some(user.display_name),
        author_avatar_url: user.avatar_url,
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
        (status = 200, description = "Tweet found", body = Tweet),
        (status = 404, description = "Tweet not found")
    ),
    tag = "tweets"
)]
pub async fn get_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<Tweet>, (StatusCode, Json<serde_json::Value>)> {
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
                Json(serde_json::json!({"error": "Database error, can't find tweet"})),
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
                    let mut tweet_with_author = tweet;
                    tweet_with_author.author_username = Some(author.username);
                    tweet_with_author.author_display_name = Some(author.display_name);
                    tweet_with_author.author_avatar_url = author.avatar_url;
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

    let tweets_with_authors: Vec<Tweet> = tweets
        .into_iter()
        .filter_map(|mut tweet| {
            author_map.get(&tweet.author_id).map(|author| {
                tweet.author_username = Some(author.username.clone());
                tweet.author_display_name = Some(author.display_name.clone());
                tweet.author_avatar_url = author.avatar_url.clone();
                tweet
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
        .update_one(doc! {"_id": object_id}, doc! {"$inc": {"likes_count": 1}})
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

/// Generate fake tweets for testing
#[utoipa::path(
    post,
    path = "/tweets/fake",
    responses(
        (status = 200, description = "Fake tweets generated successfully", body = TweetListResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "tweets"
)]
pub async fn generate_fake_tweets(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<TweetListResponse>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tweet> = db.collection("tweets");

    // Sample fake tweets
    let fake_tweets = vec![
        Tweet {
            id: None,
            author_id: ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap(),
            content: "Just discovered this amazing new coffee shop downtown! ☕ The barista made the perfect latte art. #coffee #morningvibes".to_string(),
            created_at: mongodb::bson::DateTime::now(),
            likes_count: 42,
            retweets_count: 8,
            replies_count: 3,
            is_liked: false,
            is_retweeted: false,
            author_username: None,
            author_display_name: None,
            author_avatar_url: None,
        },
        Tweet {
            id: None,
            author_id: ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap(),
            content: "Working on a new project and the code is finally coming together! 🚀 Nothing beats that feeling when everything clicks. #coding #programming".to_string(),
            created_at: mongodb::bson::DateTime::now(),
            likes_count: 67,
            retweets_count: 12,
            replies_count: 5,
            is_liked: false,
            is_retweeted: false,
            author_username: None,
            author_display_name: None,
            author_avatar_url: None,
        },
        Tweet {
            id: None,
            author_id: ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap(),
            content: "Beautiful sunset today! 🌅 Sometimes you just need to stop and appreciate the simple things in life. #nature #grateful".to_string(),
            created_at: mongodb::bson::DateTime::now(),
            likes_count: 89,
            retweets_count: 15,
            replies_count: 7,
            is_liked: false,
            is_retweeted: false,
            author_username: None,
            author_display_name: None,
            author_avatar_url: None,
        },
        Tweet {
            id: None,
            author_id: ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap(),
            content: "Just finished reading an incredible book! 📚 The plot twists were mind-blowing. Can't wait to discuss it with friends. #reading #books".to_string(),
            created_at: mongodb::bson::DateTime::now(),
            likes_count: 34,
            retweets_count: 6,
            replies_count: 2,
            is_liked: false,
            is_retweeted: false,
            author_username: None,
            author_display_name: None,
            author_avatar_url: None,
        },
        Tweet {
            id: None,
            author_id: ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap(),
            content: "Weekend vibes are the best! 🎉 Time to relax, catch up with friends, and maybe try that new restaurant everyone's been talking about. #weekend #friends".to_string(),
            created_at: mongodb::bson::DateTime::now(),
            likes_count: 56,
            retweets_count: 9,
            replies_count: 4,
            is_liked: false,
            is_retweeted: false,
            author_username: None,
            author_display_name: None,
            author_avatar_url: None,
        },
    ];

    // Insert fake tweets into database
    match collection.insert_many(fake_tweets).await {
        Ok(_) => {
            // Fetch all tweets after insertion
            let mut cursor = collection.find(doc! {}).await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": format!("Failed to fetch tweets: {}", e)
                    })),
                )
            })?;

            let mut tweets = Vec::new();
            while let Some(tweet) = cursor.try_next().await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": format!("Failed to process tweets: {}", e)
                    })),
                )
            })? {
                // Convert to Tweet (simplified for now)
                let mut tweet_with_author = tweet;
                tweet_with_author.author_username = Some("test_user".to_string());
                tweet_with_author.author_display_name = Some("Test User".to_string());
                tweet_with_author.author_avatar_url = None;
                tweets.push(tweet_with_author);
            }

            let total = tweets.len() as i64;
            let response = TweetListResponse { tweets, total };

            Ok((StatusCode::OK, Json(response)))
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to insert fake tweets: {}", e)
            })),
        )),
    }
}

/// Clear all tweets and users (for development/testing)
#[utoipa::path(
    post,
    path = "/admin/clear-all",
    responses(
        (status = 200, description = "All data cleared successfully")
    ),
    tag = "admin"
)]
pub async fn clear_all_data(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

    // Clear all tweets
    tweet_collection.delete_many(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to clear tweets"})),
        )
    })?;

    // Clear all users
    user_collection.delete_many(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to clear users"})),
        )
    })?;

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({"message": "All data cleared successfully"})),
    ))
}
