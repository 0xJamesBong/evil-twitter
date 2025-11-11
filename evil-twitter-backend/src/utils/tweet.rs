use axum::{Json, http::StatusCode};
use futures::TryStreamExt;
use mongodb::{
    Collection,
    bson::{doc, oid::ObjectId},
};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

use crate::models::{
    tweet::{Tweet, TweetAuthorSnapshot, TweetView},
    user::User,
};

pub type ApiError = (StatusCode, Json<Value>);
type ApiResult<T> = Result<T, ApiError>;

fn json_error(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(serde_json::json!({ "error": message.into() })))
}

fn internal_error(message: &str) -> ApiError {
    json_error(StatusCode::INTERNAL_SERVER_ERROR, message)
}

fn not_found(message: &str) -> ApiError {
    json_error(StatusCode::NOT_FOUND, message)
}

#[derive(Debug, serde::Serialize)]
pub struct TweetThreadResponse {
    pub tweet: TweetView,
    pub parents: Vec<TweetView>,
    pub replies: Vec<TweetView>,
}

fn apply_author_snapshot(tweet: &mut Tweet, user: &User) {
    tweet.author_snapshot = TweetAuthorSnapshot {
        username: Some(user.username.clone()),
        display_name: Some(user.display_name.clone()),
        avatar_url: user.avatar_url.clone(),
    }
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

pub async fn enrich_tweets_with_references(
    tweets: Vec<Tweet>,
    tweet_collection: &Collection<Tweet>,
    user_collection: &Collection<User>,
) -> ApiResult<Vec<TweetView>> {
    hydrate_tweets_with_references(tweets, tweet_collection, user_collection).await
}

pub async fn assemble_thread_response(
    db: &mongodb::Database,
    tweet_id: ObjectId,
) -> Result<TweetThreadResponse, ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");

    let target_tweet = tweet_collection
        .find_one(doc! {"_id": tweet_id})
        .await
        .map_err(|_| internal_error("Database error fetching tweet"))?
        .ok_or_else(|| not_found("Tweet not found"))?;

    let target_id = target_tweet
        .id
        .ok_or_else(|| internal_error("Tweet document missing identifier"))?;
    let root_id = target_tweet.root_tweet_id.unwrap_or(target_id);

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

    Ok(TweetThreadResponse {
        tweet: target_view,
        parents: parents_view,
        replies: replies_view,
    })
}
