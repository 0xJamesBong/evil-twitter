use axum::{Json, http::StatusCode};
use futures::TryStreamExt;
use mongodb::{
    Collection,
    bson::{doc, oid::ObjectId},
};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

use crate::models::{
    post_state::PostState,
    profile::Profile,
    tweet::{Tweet, TweetView},
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

#[derive(Debug, serde::Serialize)]
pub struct AnswerWithComments {
    pub answer: TweetView,
    pub comments: Vec<TweetView>,
}

#[derive(Debug, serde::Serialize)]
pub struct QuestionThreadResponse {
    pub question: TweetView,
    pub question_comments: Vec<TweetView>,
    pub answers: Vec<AnswerWithComments>,
}

async fn hydrate_tweets_with_references(
    tweets: Vec<Tweet>,
    tweet_collection: &Collection<Tweet>,
    _user_collection: &Collection<User>,
    _profile_collection: &mongodb::Collection<crate::models::profile::Profile>,
) -> ApiResult<Vec<TweetView>> {
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
    db: &mongodb::Database,
) -> ApiResult<Vec<TweetView>> {
    // Get profile collection from the database (needed for the function signature, but not used)
    let profile_collection: Collection<crate::models::profile::Profile> = db.collection("profiles");
    hydrate_tweets_with_references(
        tweets,
        tweet_collection,
        user_collection,
        &profile_collection,
    )
    .await
}

pub async fn assemble_thread_response(
    db: &mongodb::Database,
    tweet_id: ObjectId,
) -> Result<TweetThreadResponse, ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");
    let profile_collection: Collection<Profile> = db.collection("profiles");

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
        hydrate_tweets_with_references(
            parent_chain,
            &tweet_collection,
            &user_collection,
            &profile_collection,
        )
        .await?
    };

    let mut target_view = hydrate_tweets_with_references(
        vec![target_tweet.clone()],
        &tweet_collection,
        &user_collection,
        &profile_collection,
    )
    .await?;
    let target_view = target_view
        .pop()
        .ok_or_else(|| internal_error("Failed to hydrate target tweet"))?;

    let replies_view = if descendants.is_empty() {
        Vec::new()
    } else {
        hydrate_tweets_with_references(
            descendants,
            &tweet_collection,
            &user_collection,
            &profile_collection,
        )
        .await?
    };

    Ok(TweetThreadResponse {
        tweet: target_view,
        parents: parents_view,
        replies: replies_view,
    })
}

pub async fn assemble_question_thread_response(
    db: &mongodb::Database,
    question_id: ObjectId,
) -> Result<QuestionThreadResponse, ApiError> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");
    let profile_collection: Collection<Profile> = db.collection("profiles");
    let post_states_collection: Collection<PostState> = db.collection(PostState::COLLECTION_NAME);

    // Fetch the question tweet
    let question_tweet = tweet_collection
        .find_one(doc! {"_id": question_id})
        .await
        .map_err(|_| internal_error("Database error fetching question tweet"))?
        .ok_or_else(|| not_found("Question tweet not found"))?;

    let question_tweet_id = question_tweet
        .id
        .ok_or_else(|| internal_error("Question tweet missing identifier"))?;

    // Get all direct replies to the question
    let mut cursor = tweet_collection
        .find(doc! {"replied_to_tweet_id": question_tweet_id})
        .await
        .map_err(|_| internal_error("Database error fetching question replies"))?;

    let mut all_replies: Vec<Tweet> = Vec::new();
    while let Some(tweet) = cursor
        .try_next()
        .await
        .map_err(|_| internal_error("Database error iterating question replies"))?
    {
        all_replies.push(tweet);
    }

    // Fetch postStates for all replies to determine function type
    let post_id_hashes: Vec<String> = all_replies
        .iter()
        .filter_map(|tweet| tweet.post_id_hash.clone())
        .collect();

    let mut post_states_map: HashMap<String, PostState> = HashMap::new();
    if !post_id_hashes.is_empty() {
        let mut cursor = post_states_collection
            .find(doc! {"post_id_hash": {"$in": &post_id_hashes}})
            .await
            .map_err(|_| internal_error("Database error fetching post states"))?;

        while let Some(post_state) = cursor
            .try_next()
            .await
            .map_err(|_| internal_error("Database error iterating post states"))?
        {
            post_states_map.insert(post_state.post_id_hash.clone(), post_state);
        }
    }

    // Separate replies into answers and comments on question
    let mut answers: Vec<Tweet> = Vec::new();
    let mut question_comments: Vec<Tweet> = Vec::new();

    for reply in all_replies {
        let is_answer = reply
            .post_id_hash
            .as_ref()
            .and_then(|hash| post_states_map.get(hash))
            .and_then(|state| state.function.as_ref())
            .map(|func| func == "Answer")
            .unwrap_or(false);

        if is_answer {
            answers.push(reply);
        } else {
            question_comments.push(reply);
        }
    }

    // For each answer, get its comments
    let answer_ids: Vec<ObjectId> = answers
        .iter()
        .filter_map(|tweet| tweet.id)
        .collect();

    let mut answer_comments_map: HashMap<ObjectId, Vec<Tweet>> = HashMap::new();
    if !answer_ids.is_empty() {
        let mut cursor = tweet_collection
            .find(doc! {"replied_to_tweet_id": {"$in": &answer_ids}})
            .await
            .map_err(|_| internal_error("Database error fetching answer comments"))?;

        while let Some(comment) = cursor
            .try_next()
            .await
            .map_err(|_| internal_error("Database error iterating answer comments"))?
        {
            if let Some(parent_id) = comment.replied_to_tweet_id {
                answer_comments_map
                    .entry(parent_id)
                    .or_insert_with(Vec::new)
                    .push(comment);
            }
        }
    }

    // Hydrate all tweets with references
    let question_view = {
        let mut views = hydrate_tweets_with_references(
            vec![question_tweet],
            &tweet_collection,
            &user_collection,
            &profile_collection,
        )
        .await?;
        views
            .pop()
            .ok_or_else(|| internal_error("Failed to hydrate question tweet"))?
    };

    let question_comments_view = if question_comments.is_empty() {
        Vec::new()
    } else {
        hydrate_tweets_with_references(
            question_comments,
            &tweet_collection,
            &user_collection,
            &profile_collection,
        )
        .await?
    };

    let answers_view = if answers.is_empty() {
        Vec::new()
    } else {
        hydrate_tweets_with_references(
            answers,
            &tweet_collection,
            &user_collection,
            &profile_collection,
        )
        .await?
    };

    // Build AnswerWithComments for each answer
    let mut answers_with_comments: Vec<AnswerWithComments> = Vec::new();
    for answer_view in answers_view {
        let answer_id = answer_view
            .tweet
            .id
            .ok_or_else(|| internal_error("Answer tweet missing identifier"))?;

        let comments = answer_comments_map
            .remove(&answer_id)
            .unwrap_or_default();

        let comments_view = if comments.is_empty() {
            Vec::new()
        } else {
            hydrate_tweets_with_references(
                comments,
                &tweet_collection,
                &user_collection,
                &profile_collection,
            )
            .await?
        };

        answers_with_comments.push(AnswerWithComments {
            answer: answer_view,
            comments: comments_view,
        });
    }

    Ok(QuestionThreadResponse {
        question: question_view,
        question_comments: question_comments_view,
        answers: answers_with_comments,
    })
}
