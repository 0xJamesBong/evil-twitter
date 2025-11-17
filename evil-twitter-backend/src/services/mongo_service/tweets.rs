use async_graphql::Result;
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};

use crate::{
    models::{
        like::Like,
        tweet::{Tweet, TweetEnergyState, TweetMetrics, TweetType, TweetView, TweetViewerContext},
        user::User,
    },
    utils::tweet::TweetThreadResponse,
};

/// Service for tweet-related database operations
#[derive(Clone)]
pub struct TweetService {
    db: Database,
}

impl TweetService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get the tweets collection
    fn tweet_collection(&self) -> Collection<Tweet> {
        self.db.collection(Tweet::COLLECTION_NAME)
    }

    /// Get the users collection
    fn user_collection(&self) -> Collection<User> {
        self.db.collection(User::COLLECTION_NAME)
    }

    /// Get the likes collection
    fn like_collection(&self) -> Collection<Like> {
        self.db.collection(Like::COLLECTION_NAME)
    }

    /// Get the database (for utility functions that need it)
    pub fn db(&self) -> &Database {
        &self.db
    }
}

impl TweetService {
    /// Create a new original tweet and return enriched view
    pub async fn create_tweet_with_author(&self, user: User, content: String) -> Result<TweetView> {
        let tweet_collection = self.tweet_collection();

        let owner_id = user
            .id
            .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;

        let now = mongodb::bson::DateTime::now();
        let tweet_id = ObjectId::new();

        let tweet = Tweet {
            id: Some(tweet_id),
            owner_id,
            content,
            tweet_type: TweetType::Original,
            quoted_tweet_id: None,
            replied_to_tweet_id: None,
            root_tweet_id: Some(tweet_id),
            reply_depth: 0,
            created_at: now,
            updated_at: Some(now),
            metrics: TweetMetrics::default(),
            viewer_context: TweetViewerContext::default(),
            energy_state: TweetEnergyState::default(),
        };

        tweet_collection
            .insert_one(&tweet)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create tweet: {}", e)))?;

        let views = self.enrich_tweets(vec![tweet]).await?;
        views
            .into_iter()
            .next()
            .ok_or_else(|| async_graphql::Error::new("Failed to hydrate tweet"))
    }

    /// Create a new tweet
    pub async fn create_tweet(&self, tweet: Tweet) -> Result<Tweet> {
        let tweet_collection = self.tweet_collection();
        tweet_collection
            .insert_one(&tweet)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create tweet: {}", e)))?;
        Ok(tweet)
    }

    /// Get a tweet by ID
    pub async fn get_tweet_by_id(&self, id: ObjectId) -> Result<Option<Tweet>> {
        let tweet_collection = self.tweet_collection();
        let tweet = tweet_collection
            .find_one(doc! { "_id": id })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get tweet: {}", e)))?;
        Ok(tweet)
    }

    /// Get tweets with viewer context (for enriched views)
    pub async fn get_tweet_view(
        &self,
        id: ObjectId,
        _viewer_context: Option<TweetViewerContext>,
    ) -> Result<Option<TweetView>> {
        // This would implement the logic from enrich_tweets_with_references
        // For now, a simple implementation
        let tweet = self.get_tweet_by_id(id).await?;
        match tweet {
            Some(t) => Ok(Some(TweetView {
                tweet: t,
                quoted_tweet: None,
                replied_to_tweet: None,
            })),
            None => Ok(None),
        }
    }

    /// Update tweet metrics (likes, retweets, etc.)
    pub async fn update_tweet_metrics(
        &self,
        tweet_id: ObjectId,
        metrics_update: impl Fn(&mut crate::models::tweet::TweetMetrics),
    ) -> Result<()> {
        let tweet_collection = self.tweet_collection();
        // Get current tweet
        let mut tweet = self
            .get_tweet_by_id(tweet_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

        // Update metrics
        metrics_update(&mut tweet.metrics);

        // Save back
        tweet_collection
            .replace_one(doc! { "_id": tweet_id }, &tweet)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update tweet: {}", e)))?;

        Ok(())
    }

    /// Get tweets by owner
    pub async fn get_tweets_by_owner(
        &self,
        owner_id: ObjectId,
        limit: i64,
        skip: u64,
    ) -> Result<Vec<Tweet>> {
        let tweet_collection = self.tweet_collection();
        let mut cursor = tweet_collection
            .find(doc! { "owner_id": owner_id })
            .sort(doc! { "created_at": -1 })
            .limit(limit)
            .skip(skip)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to query tweets: {}", e)))?;

        let mut tweets = Vec::new();
        while cursor
            .advance()
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to iterate tweets: {}", e)))?
        {
            tweets.push(
                cursor.deserialize_current().map_err(|e| {
                    async_graphql::Error::new(format!("Failed to deserialize: {}", e))
                })?,
            );
        }
        Ok(tweets)
    }

    /// Enrich tweets with author snapshots and referenced tweets
    pub async fn enrich_tweets(&self, tweets: Vec<Tweet>) -> Result<Vec<TweetView>> {
        let tweet_collection = self.tweet_collection();
        let user_collection = self.user_collection();
        crate::utils::tweet::enrich_tweets_with_references(
            tweets,
            &tweet_collection,
            &user_collection,
            &self.db,
        )
        .await
        .map_err(|(status, json)| {
            let msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Failed to enrich tweets");
            async_graphql::Error::new(format!("{} (status {})", msg, status))
        })
    }

    /// Get timeline (all tweets, sorted by created_at)
    pub async fn get_timeline(&self, limit: i64) -> Result<Vec<TweetView>> {
        let tweet_collection = self.tweet_collection();
        let mut cursor = tweet_collection
            .find(doc! {})
            .sort(doc! {"created_at": -1})
            .limit(limit)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to query timeline: {}", e)))?;

        let mut tweets = Vec::new();
        while let Some(tweet) = cursor
            .try_next()
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to iterate: {}", e)))?
        {
            tweets.push(tweet);
        }

        self.enrich_tweets(tweets).await
    }

    /// Get tweet thread (parents, target, replies)
    pub async fn get_tweet_thread(&self, tweet_id: ObjectId) -> Result<TweetThreadResponse> {
        crate::utils::tweet::assemble_thread_response(self.db(), tweet_id)
            .await
            .map_err(|(status, json)| {
                let msg = json
                    .get("error")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Failed to assemble thread");
                async_graphql::Error::new(format!("{} (status {})", msg, status))
            })
    }

    /// Create a reply to a tweet
    pub async fn create_reply(
        &self,
        user: User,
        content: String,
        replied_to_id: ObjectId,
    ) -> Result<TweetView> {
        let tweet_collection = self.tweet_collection();
        let replied_tweet = self
            .get_tweet_by_id(replied_to_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

        let owner_id = user
            .id
            .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;
        let now = mongodb::bson::DateTime::now();
        let reply_id = ObjectId::new();
        let root_id = replied_tweet
            .root_tweet_id
            .or(replied_tweet.id)
            .unwrap_or(reply_id);

        let reply = Tweet {
            id: Some(reply_id),
            owner_id,
            content,
            tweet_type: TweetType::Reply,
            quoted_tweet_id: None,
            replied_to_tweet_id: Some(replied_to_id),
            root_tweet_id: Some(root_id),
            reply_depth: replied_tweet.reply_depth + 1,
            created_at: now,
            updated_at: Some(now),
            metrics: TweetMetrics::default(),
            viewer_context: TweetViewerContext::default(),
            energy_state: TweetEnergyState::default(),
        };

        tweet_collection
            .insert_one(&reply)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create reply: {}", e)))?;

        tweet_collection
            .update_one(
                doc! {"_id": replied_to_id},
                doc! {"$inc": {"metrics.replies": 1}},
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

        let views = self.enrich_tweets(vec![reply]).await?;
        views
            .into_iter()
            .next()
            .ok_or_else(|| async_graphql::Error::new("Failed to hydrate reply"))
    }

    /// Create a quote tweet
    pub async fn create_quote(
        &self,
        user: User,
        content: String,
        quoted_tweet_id: ObjectId,
    ) -> Result<TweetView> {
        let tweet_collection = self.tweet_collection();
        let _quoted_tweet = self
            .get_tweet_by_id(quoted_tweet_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Original tweet not found"))?;

        let owner_id = user
            .id
            .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;
        let now = mongodb::bson::DateTime::now();
        let quote_id = ObjectId::new();

        let quote = Tweet {
            id: Some(quote_id),
            owner_id,
            content,
            tweet_type: TweetType::Quote,
            quoted_tweet_id: Some(quoted_tweet_id),
            replied_to_tweet_id: None,
            root_tweet_id: Some(quote_id),
            reply_depth: 0,
            created_at: now,
            updated_at: Some(now),
            metrics: TweetMetrics::default(),
            viewer_context: TweetViewerContext::default(),
            energy_state: TweetEnergyState::default(),
        };

        tweet_collection
            .insert_one(&quote)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create quote: {}", e)))?;

        tweet_collection
            .update_one(
                doc! {"_id": quoted_tweet_id},
                doc! {"$inc": {"metrics.quotes": 1}},
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

        let views = self.enrich_tweets(vec![quote]).await?;
        views
            .into_iter()
            .next()
            .ok_or_else(|| async_graphql::Error::new("Failed to hydrate quote"))
    }

    /// Create a retweet
    pub async fn create_retweet(
        &self,
        user: User,
        original_tweet_id: ObjectId,
    ) -> Result<TweetView> {
        let tweet_collection = self.tweet_collection();
        let original_tweet = self
            .get_tweet_by_id(original_tweet_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Original tweet not found"))?;

        let owner_id = user
            .id
            .ok_or_else(|| async_graphql::Error::new("User record missing identifier"))?;
        let now = mongodb::bson::DateTime::now();
        let retweet_id = ObjectId::new();

        let retweet = Tweet {
            id: Some(retweet_id),
            owner_id,
            content: original_tweet.content.clone(),
            tweet_type: TweetType::Retweet,
            quoted_tweet_id: Some(original_tweet_id),
            replied_to_tweet_id: None,
            root_tweet_id: Some(retweet_id),
            reply_depth: 0,
            created_at: now,
            updated_at: Some(now),
            metrics: TweetMetrics::default(),
            viewer_context: TweetViewerContext::default(),
            energy_state: TweetEnergyState::default(),
        };

        tweet_collection
            .insert_one(&retweet)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create retweet: {}", e)))?;

        tweet_collection
            .update_one(
                doc! {"_id": original_tweet_id},
                doc! {"$inc": {"metrics.retweets": 1}},
            )
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

        let views = self.enrich_tweets(vec![retweet]).await?;
        views
            .into_iter()
            .next()
            .ok_or_else(|| async_graphql::Error::new("Failed to hydrate retweet"))
    }

    /// Toggle like on a tweet (like if not liked, unlike if liked)
    pub async fn toggle_like(
        &self,
        user_id: ObjectId,
        tweet_id: ObjectId,
    ) -> Result<(i64, i64, bool, f64)> {
        const LIKE_IMPACT: f64 = 10.0;
        let tweet_collection = self.tweet_collection();
        let like_collection = self.like_collection();

        let mut tweet = self
            .get_tweet_by_id(tweet_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Tweet not found"))?;

        let like_filter = doc! {"user_id": user_id, "tweet_id": tweet_id};
        let existing_like = like_collection
            .find_one(like_filter.clone())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

        let is_liking = existing_like.is_none();

        if is_liking {
            // Like the tweet
            tweet.energy_state.energy_gained_from_support += LIKE_IMPACT;
            tweet.metrics.inc_like();

            let like = Like {
                id: None,
                user_id,
                tweet_id,
                created_at: mongodb::bson::DateTime::now(),
            };

            like_collection
                .insert_one(&like)
                .await
                .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

            tweet_collection
                .update_one(
                    doc! {"_id": tweet_id},
                    doc! {
                        "$inc": {"metrics.likes": 1},
                        "$set": {
                            "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                                .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?,
                            "metrics.smacks": tweet.metrics.smacks
                        }
                    },
                )
                .await
                .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
        } else {
            // Unlike the tweet
            like_collection
                .delete_one(like_filter)
                .await
                .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

            tweet.energy_state.energy_gained_from_support -= LIKE_IMPACT;

            tweet_collection
                .update_one(
                    doc! {"_id": tweet_id},
                    doc! {
                        "$inc": {"metrics.likes": -1},
                        "$set": {
                            "energy_state": mongodb::bson::to_bson(&tweet.energy_state)
                                .map_err(|e| async_graphql::Error::new(format!("Serialization error: {}", e)))?,
                            "metrics.smacks": tweet.metrics.smacks
                        }
                    },
                )
                .await
                .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
        }

        // Fetch updated tweet to get accurate counts
        let updated_tweet = self
            .get_tweet_by_id(tweet_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Tweet not found after update"))?;

        Ok((
            updated_tweet.metrics.likes,
            updated_tweet.metrics.smacks,
            is_liking,
            updated_tweet.energy_state.energy,
        ))
    }
}
