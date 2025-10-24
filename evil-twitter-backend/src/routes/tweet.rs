use std::collections::{HashMap, HashSet};

use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};
use serde::Serialize;
use serde_json::{Value, json};
use utoipa::ToSchema;

use crate::utils::auth::get_authenticated_user;
use crate::{
    middleware::wall::compose_wall,
    models::{
        tool::Tool,
        tweet::{
            CreateTweet, Tweet, TweetAuthorSnapshot, TweetEnergyState, TweetMetrics, TweetType,
            TweetView, TweetViewerContext,
        },
        user::User,
    },
};

use crate::actions::engine::{ActionEngine, ActionType};

type ApiError = (StatusCode, Json<Value>);
type ApiResult<T> = Result<T, ApiError>;

fn json_error(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

fn internal_error(message: &str) -> ApiError {
    json_error(StatusCode::INTERNAL_SERVER_ERROR, message)
}

fn bad_request(message: impl Into<String>) -> ApiError {
    json_error(StatusCode::BAD_REQUEST, message)
}

fn not_found(message: &str) -> ApiError {
    json_error(StatusCode::NOT_FOUND, message)
}

fn ok_message(message: &str) -> Json<Value> {
    Json(json!({ "message": message }))
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TweetListResponse {
    pub tweets: Vec<TweetView>,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TweetThreadResponse {
    pub tweet: TweetView,
    pub parents: Vec<TweetView>,
    pub replies: Vec<TweetView>,
}

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct SupportTweetRequest {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub tool_id: Option<String>,
}

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct AttackTweetRequest {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub tool_id: Option<String>,
}

fn extract_supabase_id_from_auth_header(auth_header: &str) -> Result<String, String> {
    let token = match auth_header.strip_prefix("Bearer ") {
        Some(t) => t.trim(),
        None => return Err("Authorization header is not Bearer".into()),
    };

    let token = token
        .split_whitespace()
        .next()
        .ok_or_else(|| "Empty bearer token".to_string())?;
    let token = token
        .split('/')
        .next()
        .ok_or_else(|| "Malformed bearer token".to_string())?;

    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("JWT must have three parts".into());
    }

    let payload_b64 = parts[1];
    let decoded = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|e| format!("base64 decode error: {e}"))?;

    let payload: Value =
        serde_json::from_slice(&decoded).map_err(|e| format!("payload JSON parse error: {e}"))?;

    if let Some(sub) = payload.get("sub").and_then(|v| v.as_str()) {
        return Ok(sub.to_string());
    }

    if let Some(sub) = payload
        .get("user")
        .and_then(|user| user.get("id").or_else(|| user.get("sub")))
        .and_then(|v| v.as_str())
    {
        return Ok(sub.to_string());
    }

    if let Some(sub) = payload
        .get("user_metadata")
        .and_then(|user| user.get("sub"))
        .and_then(|v| v.as_str())
    {
        return Ok(sub.to_string());
    }

    Err("Could not find `sub` in token payload".into())
}

fn apply_author_snapshot(tweet: &mut Tweet, user: &User) {
    tweet.author_snapshot = TweetAuthorSnapshot {
        username: Some(user.username.clone()),
        display_name: Some(user.display_name.clone()),
        avatar_url: user.avatar_url.clone(),
    };
}

async fn ensure_author_snapshots(
    tweets: &mut [Tweet],
    user_collection: &Collection<User>,
) -> ApiResult<()> {
    let missing_owner_ids: HashSet<ObjectId> = tweets
        .iter()
        .filter(|tweet| {
            tweet.author_snapshot.username.is_none() || tweet.author_snapshot.display_name.is_none()
        })
        .map(|tweet| tweet.owner_id)
        .collect();

    if missing_owner_ids.is_empty() {
        return Ok(());
    }

    let owner_list: Vec<ObjectId> = missing_owner_ids.into_iter().collect();
    let mut cursor = user_collection
        .find(doc! {"_id": {"$in": &owner_list}})
        .await
        .map_err(|_| internal_error("Database error fetching users for tweets"))?;

    let mut user_map: HashMap<ObjectId, User> = HashMap::new();
    while let Some(user) = cursor
        .try_next()
        .await
        .map_err(|_| internal_error("Database error reading user cursor"))?
    {
        if let Some(id) = user.id {
            user_map.insert(id, user);
        }
    }

    for tweet in tweets.iter_mut() {
        if let Some(user) = user_map.get(&tweet.owner_id) {
            apply_author_snapshot(tweet, user);
        }
    }

    Ok(())
}

async fn hydrate_tweets_with_references(
    mut tweets: Vec<Tweet>,
    tweet_collection: &Collection<Tweet>,
    user_collection: &Collection<User>,
) -> ApiResult<Vec<TweetView>> {
    ensure_author_snapshots(&mut tweets, user_collection).await?;

    let mut referenced_ids: HashSet<ObjectId> = HashSet::new();
    for tweet in &tweets {
        if let Some(id) = tweet.quoted_tweet_id {
            referenced_ids.insert(id);
        }
        if let Some(id) = tweet.replied_to_tweet_id {
            referenced_ids.insert(id);
        }
    }

    let mut referenced_map: HashMap<ObjectId, Tweet> = HashMap::new();
    if !referenced_ids.is_empty() {
        let mut referenced = tweet_collection
            .find(doc! {"_id": {"$in": referenced_ids.iter().collect::<Vec<_>>()}})
            .await
            .map_err(|_| internal_error("Database error fetching referenced tweets"))?;

        let mut referenced_tweets: Vec<Tweet> = Vec::new();
        while let Some(tweet) = referenced
            .try_next()
            .await
            .map_err(|_| internal_error("Database error reading referenced tweets"))?
        {
            referenced_tweets.push(tweet);
        }

        ensure_author_snapshots(&mut referenced_tweets, user_collection).await?;

        for tweet in referenced_tweets {
            if let Some(id) = tweet.id {
                referenced_map.insert(id, tweet);
            }
        }
    }

    let mut views: Vec<TweetView> = Vec::with_capacity(tweets.len());
    for tweet in tweets {
        let quoted_id = tweet.quoted_tweet_id;
        let replied_id = tweet.replied_to_tweet_id;
        let mut view = TweetView::from_tweet(tweet);

        if let Some(quoted_id) = quoted_id {
            if let Some(referenced) = referenced_map.get(&quoted_id) {
                view.quoted_tweet = Some(Box::new(TweetView::from_tweet(referenced.clone())));
            }
        }

        if let Some(replied_id) = replied_id {
            if let Some(referenced) = referenced_map.get(&replied_id) {
                view.replied_to_tweet = Some(Box::new(TweetView::from_tweet(referenced.clone())));
            }
        }

        views.push(view);
    }

    Ok(views)
}

fn parse_object_id(id: &str, label: &str) -> ApiResult<ObjectId> {
    ObjectId::parse_str(id).map_err(|_| bad_request(format!("Invalid {} ID", label)))
}

#[utoipa::path(
    post,
    path = "/tweets",
    request_body = CreateTweet,
    responses(
        (status = 201, description = "Tweet created successfully", body = TweetView),
        (status = 400, description = "Invalid input data")
    ),
    tag = "tweets"
)]
pub async fn create_tweet(
    State(db): State<Database>,
    headers: HeaderMap,
    Json(payload): Json<CreateTweet>,
) -> Result<(StatusCode, Json<TweetView>), ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;

    let supabase_id = extract_supabase_id_from_auth_header(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization token: {err}"),
        )
    })?;

    let user = user_collection
        .find_one(doc! {"supabase_id": supabase_id})
        .await
        .map_err(|_| internal_error("Database error fetching user"))?
        .ok_or_else(|| not_found("User not found"))?;

    let owner_id = user
        .id
        .ok_or_else(|| internal_error("User record missing identifier"))?;

    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let now = mongodb::bson::DateTime::now();
    let tweet_id = ObjectId::new();

    let tweet = Tweet {
        id: Some(tweet_id),
        owner_id,
        content: payload.content,
        tweet_type: TweetType::Original,
        quoted_tweet_id: None,
        replied_to_tweet_id: None,
        root_tweet_id: Some(tweet_id),
        reply_depth: 0,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),

        energy_state: TweetEnergyState::default(),
    };

    tweet_collection
        .insert_one(&tweet)
        .await
        .map_err(|_| internal_error("Failed to create tweet"))?;

    Ok((StatusCode::CREATED, Json(TweetView::from_tweet(tweet))))
}

#[utoipa::path(
    get,
    path = "/tweets/{id}",
    params(("id" = String, Path, description = "Tweet ID" )),
    responses(
        (status = 200, description = "Tweet found", body = TweetView),
        (status = 404, description = "Tweet not found")
    ),
    tag = "tweets"
)]
pub async fn get_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<TweetView>, ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let object_id = parse_object_id(&id, "tweet")?;

    let tweet = tweet_collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|_| internal_error("Database error fetching tweet"))?
        .ok_or_else(|| not_found("Tweet not found"))?;

    let mut hydrated =
        hydrate_tweets_with_references(vec![tweet], &tweet_collection, &user_collection).await?;

    hydrated
        .pop()
        .map(Json)
        .ok_or_else(|| not_found("Tweet not found after hydration"))
}

pub async fn enrich_tweets_with_references(
    tweets: Vec<Tweet>,
    tweet_collection: &Collection<Tweet>,
    user_collection: &Collection<User>,
) -> ApiResult<Vec<TweetView>> {
    hydrate_tweets_with_references(tweets, tweet_collection, user_collection).await
}

#[utoipa::path(
    get,
    path = "/tweets",
    responses(
        (status = 200, description = "Tweets timeline", body = TweetListResponse)
    ),
    tag = "tweets"
)]
pub async fn get_tweets(State(db): State<Database>) -> Result<Json<TweetListResponse>, ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let cursor = tweet_collection
        .find(doc! {})
        .sort(doc! {"created_at": -1})
        .await
        .map_err(|_| internal_error("Database error fetching tweets"))?;

    let tweets: Vec<Tweet> = cursor
        .try_collect()
        .await
        .map_err(|_| internal_error("Database error collecting tweets"))?;

    let tweets =
        hydrate_tweets_with_references(tweets, &tweet_collection, &user_collection).await?;
    let total = tweets.len() as i64;

    Ok(Json(TweetListResponse { tweets, total }))
}

#[utoipa::path(
    get,
    path = "/users/{user_id}/wall",
    params(("user_id" = String, Path, description = "User ID")),
    responses(
        (status = 200, description = "User wall", body = TweetListResponse),
        (status = 404, description = "User not found")
    ),
    tag = "tweets"
)]
pub async fn get_user_wall(
    state: State<Database>,
    path: Path<String>,
) -> Result<Json<TweetListResponse>, ApiError> {
    let tweets = compose_wall(state, path).await?;
    let total = tweets.len() as i64;

    Ok(Json(TweetListResponse { tweets, total }))
}

#[utoipa::path(
    post,
    path = "/tweets/{id}/like",
    params(("id" = String, Path, description = "Tweet ID")),
    responses((status = 200, description = "Tweet liked successfully")),
    tag = "tweets"
)]
pub async fn like_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let object_id = parse_object_id(&id, "tweet")?;

    let result = collection
        .update_one(doc! {"_id": object_id}, doc! {"$inc": {"metrics.likes": 1}})
        .await
        .map_err(|_| internal_error("Database error while liking tweet"))?;

    if result.matched_count == 0 {
        return Err(not_found("Tweet not found"));
    }

    Ok((StatusCode::OK, ok_message("Tweet liked successfully")))
}

#[utoipa::path(
    post,
    path = "/tweets/fake",
    responses(
        (status = 200, description = "Fake tweets generated", body = TweetListResponse)
    ),
    tag = "tweets"
)]
pub async fn generate_fake_tweets(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<TweetListResponse>), ApiError> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let now = mongodb::bson::DateTime::now();
    let owner_id =
        ObjectId::parse_str("68d9b685550f1355d0f01ba4").unwrap_or_else(|_| ObjectId::new());

    let templates = [
        "Just discovered this amazing new coffee shop downtown! ☕ #coffee #morningvibes",
        "Working on a new project and the code is finally coming together! 🚀",
        "Beautiful sunset today! 🌅 Sometimes you just need to pause.",
        "Finished reading an incredible book! 📚 Plot twists galore.",
        "Weekend vibes are the best! 🎉 Time to relax and recharge.",
    ];

    let mut tweets_to_insert = Vec::new();
    for content in templates {
        let tweet_id = ObjectId::new();
        tweets_to_insert.push(Tweet {
            id: Some(tweet_id),
            owner_id,
            content: content.to_string(),
            tweet_type: TweetType::Original,
            quoted_tweet_id: None,
            replied_to_tweet_id: None,
            root_tweet_id: Some(tweet_id),
            reply_depth: 0,
            created_at: now,
            updated_at: Some(now),
            metrics: TweetMetrics::default(),
            author_snapshot: TweetAuthorSnapshot::default(),
            viewer_context: TweetViewerContext::default(),
            energy_state: TweetEnergyState::default(),
        });
    }

    if !tweets_to_insert.is_empty() {
        collection
            .insert_many(tweets_to_insert.clone())
            .await
            .map_err(|_| internal_error("Failed to insert fake tweets"))?;
    }

    let tweets =
        hydrate_tweets_with_references(tweets_to_insert, &collection, &user_collection).await?;
    let total = tweets.len() as i64;

    Ok((StatusCode::OK, Json(TweetListResponse { tweets, total })))
}

#[utoipa::path(
    post,
    path = "/tweets/{id}/retweet",
    params(("id" = String, Path, description = "Tweet ID")),
    responses(
        (status = 201, description = "Tweet retweeted", body = TweetView),
        (status = 404, description = "Original tweet not found")
    ),
    tag = "tweets"
)]
pub async fn retweet_tweet(
    State(db): State<Database>,
    Path(tweet_id): Path<String>,
    headers: HeaderMap,
) -> Result<(StatusCode, Json<TweetView>), ApiError> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;
    let supabase_id = extract_supabase_id_from_auth_header(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization token: {err}"),
        )
    })?;

    let user = user_collection
        .find_one(doc! {"supabase_id": supabase_id})
        .await
        .map_err(|_| internal_error("Database error fetching user"))?
        .ok_or_else(|| not_found("User not found"))?;

    let owner_id = user
        .id
        .ok_or_else(|| internal_error("User record missing identifier"))?;
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let original_id = parse_object_id(&tweet_id, "tweet")?;
    let original_tweet = collection
        .find_one(doc! {"_id": original_id})
        .await
        .map_err(|_| internal_error("Database error fetching original tweet"))?
        .ok_or_else(|| not_found("Original tweet not found"))?;

    let now = mongodb::bson::DateTime::now();
    let retweet_id = ObjectId::new();

    let retweet = Tweet {
        id: Some(retweet_id),
        owner_id,
        content: original_tweet.content.clone(),
        tweet_type: TweetType::Retweet,
        quoted_tweet_id: Some(original_id),
        replied_to_tweet_id: None,
        root_tweet_id: Some(retweet_id),
        reply_depth: 0,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),

        energy_state: TweetEnergyState::default(),
    };

    collection
        .insert_one(&retweet)
        .await
        .map_err(|_| internal_error("Failed to create retweet"))?;

    collection
        .update_one(
            doc! {"_id": original_id},
            doc! {"$inc": {"metrics.retweets": 1}},
        )
        .await
        .map_err(|_| internal_error("Failed to update retweet count"))?;

    let mut hydrated =
        hydrate_tweets_with_references(vec![retweet], &collection, &user_collection).await?;

    hydrated
        .pop()
        .map(|tweet| (StatusCode::CREATED, Json(tweet)))
        .ok_or_else(|| internal_error("Failed to hydrate retweet"))
}

#[utoipa::path(
    post,
    path = "/tweets/{id}/quote",
    request_body = CreateTweet,
    params(("id" = String, Path, description = "Tweet ID")),
    responses(
        (status = 201, description = "Tweet quoted", body = TweetView),
        (status = 404, description = "Original tweet not found")
    ),
    tag = "tweets"
)]
pub async fn quote_tweet(
    State(db): State<Database>,
    Path(tweet_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateTweet>,
) -> Result<(StatusCode, Json<TweetView>), ApiError> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;
    let supabase_id = extract_supabase_id_from_auth_header(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization token: {err}"),
        )
    })?;

    let user = user_collection
        .find_one(doc! {"supabase_id": supabase_id})
        .await
        .map_err(|_| internal_error("Database error fetching user"))?
        .ok_or_else(|| not_found("User not found"))?;

    let quoted_id = parse_object_id(&tweet_id, "tweet")?;
    let _quoted_tweet = collection
        .find_one(doc! {"_id": quoted_id})
        .await
        .map_err(|_| internal_error("Database error fetching quoted tweet"))?
        .ok_or_else(|| not_found("Original tweet not found"))?;

    let now = mongodb::bson::DateTime::now();
    let owner_id = user
        .id
        .ok_or_else(|| internal_error("User record missing identifier"))?;
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let quote_id = ObjectId::new();

    let quote = Tweet {
        id: Some(quote_id),
        owner_id,
        content: payload.content,
        tweet_type: TweetType::Quote,
        quoted_tweet_id: Some(quoted_id),
        replied_to_tweet_id: None,
        root_tweet_id: Some(quote_id),
        reply_depth: 0,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),

        energy_state: TweetEnergyState::default(),
    };

    collection
        .insert_one(&quote)
        .await
        .map_err(|_| internal_error("Failed to create quote tweet"))?;

    collection
        .update_one(
            doc! {"_id": quoted_id},
            doc! {"$inc": {"metrics.quotes": 1}},
        )
        .await
        .map_err(|_| internal_error("Failed to update quote count"))?;

    let mut hydrated =
        hydrate_tweets_with_references(vec![quote], &collection, &user_collection).await?;

    hydrated
        .pop()
        .map(|tweet| (StatusCode::CREATED, Json(tweet)))
        .ok_or_else(|| internal_error("Failed to hydrate quote tweet"))
}

#[utoipa::path(
    post,
    path = "/tweets/{id}/reply",
    request_body = CreateTweet,
    params(("id" = String, Path, description = "Tweet ID")),
    responses(
        (status = 201, description = "Reply created", body = TweetView),
        (status = 404, description = "Original tweet not found")
    ),
    tag = "tweets"
)]
pub async fn reply_tweet(
    State(db): State<Database>,
    Path(tweet_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateTweet>,
) -> Result<(StatusCode, Json<TweetView>), ApiError> {
    let collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;
    let supabase_id = extract_supabase_id_from_auth_header(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization token: {err}"),
        )
    })?;

    let user = user_collection
        .find_one(doc! {"supabase_id": supabase_id})
        .await
        .map_err(|_| internal_error("Database error fetching user"))?
        .ok_or_else(|| not_found("User not found"))?;

    let replied_id = parse_object_id(&tweet_id, "tweet")?;
    let replied_tweet = collection
        .find_one(doc! {"_id": replied_id})
        .await
        .map_err(|_| internal_error("Database error fetching replied tweet"))?
        .ok_or_else(|| not_found("Tweet not found"))?;

    let now = mongodb::bson::DateTime::now();
    let owner_id = user
        .id
        .ok_or_else(|| internal_error("User record missing identifier"))?;
    let username = user.username;
    let display_name = user.display_name;
    let avatar_url = user.avatar_url;

    let reply_id = ObjectId::new();
    let root_id = replied_tweet
        .root_tweet_id
        .or(replied_tweet.id)
        .unwrap_or(replied_id);

    let reply = Tweet {
        id: Some(reply_id),
        owner_id,
        content: payload.content,
        tweet_type: TweetType::Reply,
        quoted_tweet_id: None,
        replied_to_tweet_id: Some(replied_id),
        root_tweet_id: Some(root_id),
        reply_depth: replied_tweet.reply_depth + 1,
        created_at: now,
        updated_at: Some(now),
        metrics: TweetMetrics::default(),
        author_snapshot: TweetAuthorSnapshot {
            username: Some(username),
            display_name: Some(display_name),
            avatar_url,
        },
        viewer_context: TweetViewerContext::default(),

        energy_state: TweetEnergyState::default(),
    };

    collection
        .insert_one(&reply)
        .await
        .map_err(|_| internal_error("Failed to create reply"))?;

    collection
        .update_one(
            doc! {"_id": replied_id},
            doc! {"$inc": {"metrics.replies": 1}},
        )
        .await
        .map_err(|_| internal_error("Failed to update reply count"))?;

    let mut hydrated =
        hydrate_tweets_with_references(vec![reply], &collection, &user_collection).await?;

    hydrated
        .pop()
        .map(|tweet| (StatusCode::CREATED, Json(tweet)))
        .ok_or_else(|| internal_error("Failed to hydrate reply"))
}

#[utoipa::path(
    post,
    path = "/admin/clear-all",
    responses((status = 200, description = "All tweets cleared")),
    tag = "admin"
)]
pub async fn clear_all_data(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    tweet_collection
        .delete_many(doc! {})
        .await
        .map_err(|_| internal_error("Failed to clear tweets"))?;

    Ok((StatusCode::OK, ok_message("All tweets cleared")))
}

pub async fn migrate_health(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");

    tweet_collection
        .update_many(
            doc! {},
            doc! {
                "$set": {
                    "health.current": 100,
                    "health.max": 100,
                    "health.history.heal_history": [],
                    "health.history.attack_history": [],
                }
            },
        )
        .await
        .map_err(|_| internal_error("Failed to migrate tweet health states"))?;

    Ok((
        StatusCode::OK,
        ok_message("Tweet health migration completed"),
    ))
}

#[utoipa::path(
    post,
    path = "/admin/migrate-users-dollar-rate",
    responses((status = 200, description = "User dollar rate migration complete")),
    tag = "admin"
)]
pub async fn migrate_users_dollar_rate(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let user_collection: Collection<User> = db.collection("users");

    user_collection
        .update_many(doc! {}, doc! {"$set": {"dollar_conversion_rate": 10000}})
        .await
        .map_err(|_| internal_error("Failed to migrate users' dollar conversion rate"))?;

    Ok((
        StatusCode::OK,
        ok_message("User dollar conversion rate migration completed"),
    ))
}

#[utoipa::path(
    post,
    path = "/tweets/{id}/heal",
    params(("id" = String, Path, description = "Tweet ID")),
    request_body = SupportTweetRequest,
    responses(
        (status = 200, description = "Tweet healed successfully"),
        (status = 404, description = "Tweet not found")
    ),
    tag = "tweets"
)]
pub async fn support_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<SupportTweetRequest>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let tool_collection: Collection<Tool> = db.collection("tools");

    // Get the attacker's user ID using the utility function

    let supporter = get_authenticated_user(&db, &headers).await?;
    let tweet_id = parse_object_id(&id, "tweet")?;

    let support_tool = tool_collection
        .find_one(doc! {"_id": payload.tool_id})
        .await
        .map_err(|_| internal_error("Database error fetching support tool"))?
        .ok_or_else(|| not_found("Support tool not found"))?;

    let mut tweet = tweet_collection
        .find_one(doc! {"_id": tweet_id})
        .await
        .map_err(|_| internal_error("Database error fetching tweet"))?
        .ok_or_else(|| not_found("Tweet not found"))?;

    let energy_before = tweet.energy_state.energy;
    ActionEngine::act_on_tweet(
        &supporter,
        &mut tweet,
        Some(&mut support_tool.clone()),
        ActionType::Support,
    );
    let energy_after = tweet.energy_state.energy;
    let support = energy_after - energy_before;

    tweet_collection.update_one(doc!{"_id": tweet_id},
        doc!{"$set": {"energy_state": mongodb::bson::to_bson(&tweet.energy_state).map_err(|_| internal_error("Serialization error"))?}}
    ).await
    .map_err(|_| internal_error("Failed to update tweet energy after support"))?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Tweet supported successfully",
            "energy_before": energy_before,
            "energy_after": energy_after,
            "energy": tweet.energy_state.energy,
            "support": support,
        })),
    ))
}

#[utoipa::path(
    post,
    path = "/tweets/{id}/attack",
    params(("id" = String, Path, description = "Tweet ID")),
    request_body = AttackTweetRequest,
    responses(
        (status = 200, description = "Tweet attacked successfully"),
        (status = 404, description = "Tweet not found")
    ),
    tag = "tweets"
)]
pub async fn attack_tweet(
    State(db): State<Database>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<AttackTweetRequest>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let tool_collection: Collection<Tool> = db.collection("tools");
    // Get the attacker's user ID using the utility function
    let attacker = crate::utils::auth::get_authenticated_user(&db, &headers).await?;

    let weapon = tool_collection
        .find_one(doc! {"_id": payload.tool_id})
        .await
        .map_err(|_| internal_error("Database error fetching weapon"))?
        .ok_or_else(|| not_found("Weapon not found"))?;

    let tweet_id = parse_object_id(&id, "tweet")?;
    let mut tweet = tweet_collection
        .find_one(doc! {"_id": tweet_id})
        .await
        .map_err(|_| internal_error("Database error fetching tweet"))?
        .ok_or_else(|| not_found("Tweet not found"))?;
    let energy_before = tweet.energy_state.energy;

    ActionEngine::act_on_tweet(
        &attacker,
        &mut tweet,
        Some(&mut weapon.clone()),
        ActionType::Attack,
    );
    let energy_after = tweet.energy_state.energy;
    let damage = energy_before - energy_after;

    tweet_collection
        .update_one(
            doc! {"_id": tweet_id},
            doc! {
                "$set": {"energy_state": mongodb::bson::to_bson(&tweet.energy_state).map_err(|_| internal_error("Serialization error"))?}
            },
        )
        .await
        .map_err(|_| internal_error("Failed to update tweet energy after attack"))?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Tweet attacked successfully",
            "energy_before": energy_before,
            "energy_after": energy_after,
            "energy": tweet.energy_state.energy,
            "damage": damage,
        })),
    ))
}

#[utoipa::path(
    get,
    path = "/tweets/{id}/thread",
    params(
        ("id" = String, Path, description = "Tweet ID whose thread should be fetched")
    ),
    responses(
        (status = 200, description = "Thread fetched", body = TweetThreadResponse),
        (status = 404, description = "Tweet not found")
    ),
    tag = "tweets"
)]
pub async fn get_thread(
    State(db): State<Database>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<TweetThreadResponse>, ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;
    let _supabase_id = extract_supabase_id_from_auth_header(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization token: {err}"),
        )
    })?;

    let tweet_id = parse_object_id(&id, "tweet")?;

    let target_tweet = tweet_collection
        .find_one(doc! {"_id": tweet_id})
        .await
        .map_err(|_| internal_error("Database error fetching tweet"))?
        .ok_or_else(|| not_found("Tweet not found"))?;

    let target_id = target_tweet
        .id
        .ok_or_else(|| internal_error("Tweet document missing identifier"))?;
    let root_id = target_tweet.root_tweet_id.unwrap_or(target_id);

    // Build parent chain from root to immediate parent
    let mut parent_chain: Vec<Tweet> = Vec::new();
    let mut current = target_tweet.clone();
    while let Some(parent_id) = current.replied_to_tweet_id {
        let parent = tweet_collection
            .find_one(doc! {"_id": parent_id})
            .await
            .map_err(|_| internal_error("Database error fetching parent tweet"))?;
        let parent = match parent {
            Some(tweet) => tweet,
            None => break,
        };
        current = parent.clone();
        parent_chain.push(parent);
    }
    parent_chain.reverse();
    let parent_ids: HashSet<ObjectId> = parent_chain.iter().filter_map(|tweet| tweet.id).collect();

    // Collect all tweets in the same root thread
    let mut cursor = tweet_collection
        .find(doc! {"root_tweet_id": root_id})
        .await
        .map_err(|_| internal_error("Database error fetching thread tweets"))?;

    let mut thread_tweets: Vec<Tweet> = Vec::new();
    while let Some(tweet) = cursor
        .try_next()
        .await
        .map_err(|_| internal_error("Database error iterating thread tweets"))?
    {
        thread_tweets.push(tweet);
    }

    // Gather all descendants (sub-tree) of the target tweet
    let mut remaining: Vec<Tweet> = thread_tweets
        .into_iter()
        .filter(|tweet| {
            if let Some(id) = tweet.id {
                id != target_id && !parent_ids.contains(&id)
            } else {
                true
            }
        })
        .collect();

    let mut descendants: Vec<Tweet> = Vec::new();
    let mut frontier: Vec<ObjectId> = vec![target_id];
    while let Some(parent_id) = frontier.pop() {
        let mut index = 0;
        while index < remaining.len() {
            if remaining[index].replied_to_tweet_id == Some(parent_id) {
                let child = remaining.remove(index);
                if let Some(child_id) = child.id {
                    frontier.push(child_id);
                }
                descendants.push(child);
            } else {
                index += 1;
            }
        }
    }

    descendants.sort_by(|a, b| {
        a.reply_depth
            .cmp(&b.reply_depth)
            .then_with(|| a.created_at.cmp(&b.created_at))
    });

    let parents_view = if parent_chain.is_empty() {
        Vec::new()
    } else {
        hydrate_tweets_with_references(parent_chain, &tweet_collection, &user_collection).await?
    };

    let mut target_view = hydrate_tweets_with_references(
        vec![target_tweet.clone()],
        &tweet_collection,
        &user_collection,
    )
    .await?;
    let target_view = target_view
        .pop()
        .ok_or_else(|| internal_error("Failed to hydrate target tweet"))?;

    let replies_view = if descendants.is_empty() {
        Vec::new()
    } else {
        hydrate_tweets_with_references(descendants, &tweet_collection, &user_collection).await?
    };

    Ok(Json(TweetThreadResponse {
        tweet: target_view,
        parents: parents_view,
        replies: replies_view,
    }))
}
