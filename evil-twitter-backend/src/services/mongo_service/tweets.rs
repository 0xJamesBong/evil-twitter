use async_graphql::Result;
use mongodb::{
    Collection,
    bson::{doc, oid::ObjectId},
};

use crate::models::tweet::{Tweet, TweetView, TweetViewerContext};

impl super::MongoService {
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
}
