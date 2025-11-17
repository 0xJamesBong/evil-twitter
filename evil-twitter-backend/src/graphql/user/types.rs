use async_graphql::{Context, Enum, ID, InputObject, Object, Result};
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};

use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::tweet::types::{TweetConnection, TweetEdge, TweetNode};
use crate::models::{follow::Follow, profile::Profile, tweet::Tweet, user::User};
use crate::utils::tweet::enrich_tweets_with_references;

// ============================================================================
// Input Types
// ============================================================================

#[derive(InputObject, Default)]
pub struct DiscoverFilters {
    #[graphql(name = "minFollowers")]
    pub min_followers: Option<i32>,
    #[graphql(name = "minTweets")]
    pub min_tweets: Option<i32>,
    pub limit: Option<i32>,
    #[graphql(name = "sortBy")]
    pub sort_by: Option<DiscoverSort>,
}

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum DiscoverSort {
    Followers,
    Tweets,
    DollarRate,
}

impl DiscoverSort {
    pub fn field_name(&self) -> &'static str {
        match self {
            DiscoverSort::Followers => "followers_count",
            DiscoverSort::Tweets => "tweets_count",
            DiscoverSort::DollarRate => "dollar_conversion_rate",
        }
    }
}

// ============================================================================
// User Node
// ============================================================================

#[derive(Clone)]
pub struct UserNode {
    inner: User,
}

impl From<User> for UserNode {
    fn from(inner: User) -> Self {
        Self { inner }
    }
}

#[Object]
impl UserNode {
    async fn id(&self) -> Option<ID> {
        self.inner.id.map(|id| ID::from(id.to_hex()))
    }

    async fn privy_id(&self) -> &str {
        &self.inner.privy_id
    }

    async fn wallet(&self) -> &str {
        &self.inner.wallet
    }

    async fn login_type(&self) -> String {
        match self.inner.login_type {
            crate::models::user::LoginType::EmailEmbedded => "email_embedded".to_string(),
            crate::models::user::LoginType::PhantomExternal => "phantom_external".to_string(),
        }
    }

    async fn email(&self) -> Option<&str> {
        self.inner.email.as_deref()
    }

    async fn status(&self) -> String {
        match self.inner.status {
            crate::models::user::UserStatus::Active => "active".to_string(),
            crate::models::user::UserStatus::Banned => "banned".to_string(),
            crate::models::user::UserStatus::ShadowBanned => "shadow_banned".to_string(),
        }
    }

    async fn created_at(&self) -> String {
        self.inner.created_at.to_chrono().to_rfc3339()
    }

    /// Get the user's profile
    async fn profile(&self, ctx: &Context<'_>) -> Result<Option<ProfileNode>> {
        let app_state = ctx.data::<Arc<AppState>>()?;
        let profile = app_state
            .mongo_service
            .profiles
            .get_profile_by_user_id(&self.inner.privy_id)
            .await?;
        Ok(profile.map(ProfileNode::from))
    }

    async fn tweets(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 20)] first: i32,
    ) -> Result<TweetConnection> {
        let app_state = ctx.data::<Arc<AppState>>()?;
        let user_id = self
            .inner
            .id
            .ok_or_else(|| async_graphql::Error::new("User missing identifier"))?;

        let limit = first.clamp(1, 50);
        let tweet_collection: Collection<Tweet> = app_state.mongo_service.tweet_collection();
        let user_collection: Collection<User> = app_state.mongo_service.user_collection();
        let mut cursor = tweet_collection
            .find(doc! {"owner_id": user_id})
            .sort(doc! {"created_at": -1})
            .limit(i64::from(limit))
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        let mut tweets = Vec::new();
        while let Some(tweet) = cursor
            .try_next()
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?
        {
            tweets.push(tweet);
        }

        let enriched = enrich_tweets_with_references(
            tweets,
            &tweet_collection,
            &user_collection,
            app_state.mongo_service.db(),
        )
        .await
        .map_err(|(status, _)| {
            async_graphql::Error::new(format!("Failed to enrich tweets (status {})", status))
        })?;

        let edges = enriched
            .into_iter()
            .filter_map(|view| {
                view.tweet.id.map(|id| TweetEdge {
                    cursor: ID::from(id.to_hex()),
                    node: TweetNode::from(view),
                })
            })
            .collect::<Vec<_>>();

        Ok(TweetConnection {
            edges,
            total_count: 0 as i64,
        })
    }

    async fn is_followed_by(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "viewerId")] viewer_id: Option<ID>,
    ) -> Result<bool> {
        let Some(viewer_id) = viewer_id else {
            return Ok(false);
        };

        let viewer_object_id = mongodb::bson::oid::ObjectId::parse_str(viewer_id.as_str())
            .map_err(|_| async_graphql::Error::new("Invalid viewer ID"))?;
        let user_id = self
            .inner
            .id
            .ok_or_else(|| async_graphql::Error::new("User missing identifier"))?;

        let app_state = ctx.data::<Arc<AppState>>()?;
        let collection: Collection<Follow> = app_state.mongo_service.follow_collection();

        let exists = collection
            .find_one(doc! {"follower_id": viewer_object_id, "following_id": user_id})
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        Ok(exists.is_some())
    }
}

// ============================================================================
// Profile Node
// ============================================================================

#[derive(Clone)]
pub struct ProfileNode {
    inner: Profile,
}

impl From<Profile> for ProfileNode {
    fn from(inner: Profile) -> Self {
        Self { inner }
    }
}

#[Object]
impl ProfileNode {
    async fn id(&self) -> Option<ID> {
        self.inner.id.map(|id| ID::from(id.to_hex()))
    }

    async fn user_id(&self) -> &str {
        &self.inner.user_id
    }

    async fn handle(&self) -> &str {
        &self.inner.handle
    }

    async fn display_name(&self) -> &str {
        &self.inner.display_name
    }

    async fn avatar_url(&self) -> Option<&str> {
        self.inner.avatar_url.as_deref()
    }

    async fn bio(&self) -> Option<&str> {
        self.inner.bio.as_deref()
    }

    async fn status(&self) -> String {
        match self.inner.status {
            crate::models::profile::ProfileStatus::Active => "active".to_string(),
            crate::models::profile::ProfileStatus::Suspended => "suspended".to_string(),
        }
    }

    async fn created_at(&self) -> String {
        self.inner.created_at.to_chrono().to_rfc3339()
    }
}
