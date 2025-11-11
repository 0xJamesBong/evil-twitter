use async_graphql::{Context, Enum, ID, InputObject, Object, Result, SimpleObject};
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};

use crate::graphql::GraphQLState;
use crate::graphql::tweet::types::{TweetConnection, TweetEdge, TweetNode};
use crate::models::{
    assets::asset::Asset,
    follow::Follow,
    tokens::{enums::TokenType, token_balance::TokenBalance},
    tweet::Tweet,
    user::User,
};
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

    async fn username(&self) -> &str {
        &self.inner.username
    }

    async fn display_name(&self) -> &str {
        &self.inner.display_name
    }

    async fn supabase_id(&self) -> &str {
        &self.inner.supabase_id
    }

    async fn email(&self) -> &str {
        &self.inner.email
    }

    async fn bio(&self) -> Option<&str> {
        self.inner.bio.as_deref()
    }

    async fn avatar_url(&self) -> Option<&str> {
        self.inner.avatar_url.as_deref()
    }

    async fn followers_count(&self) -> i32 {
        self.inner.followers_count
    }

    async fn following_count(&self) -> i32 {
        self.inner.following_count
    }

    async fn tweets_count(&self) -> i32 {
        self.inner.tweets_count
    }

    async fn dollar_conversion_rate(&self) -> i32 {
        self.inner.dollar_conversion_rate
    }

    async fn created_at(&self) -> String {
        self.inner.created_at.to_chrono().to_rfc3339()
    }

    async fn balances(&self, ctx: &Context<'_>) -> Result<TokenBalancesSummary> {
        let state = ctx.data::<GraphQLState>()?;
        let user_id = self
            .inner
            .id
            .ok_or_else(|| async_graphql::Error::new("User missing identifier"))?;

        let collection: Collection<TokenBalance> = state.db.collection("token_balances");
        let mut cursor = collection
            .find(doc! {"user_id": user_id})
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        let mut summary = TokenBalancesSummary::default();
        while let Some(balance) = cursor
            .try_next()
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?
        {
            match balance.token {
                TokenType::Dooler => summary.dooler = balance.amount,
                TokenType::Usdc => summary.usdc = balance.amount,
                TokenType::Bling => summary.bling = balance.amount,
                TokenType::Sol => summary.sol = balance.amount,
            }
        }

        Ok(summary)
    }

    async fn assets(&self, ctx: &Context<'_>) -> Result<Vec<AssetNode>> {
        let state = ctx.data::<GraphQLState>()?;
        let user_id = self
            .inner
            .id
            .ok_or_else(|| async_graphql::Error::new("User missing identifier"))?;

        let collection: Collection<Asset> = state.db.collection("assets");
        let mut cursor = collection
            .find(doc! {"owner_id": user_id})
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        let mut assets = Vec::new();
        while let Some(asset) = cursor
            .try_next()
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?
        {
            assets.push(AssetNode { inner: asset });
        }

        Ok(assets)
    }

    async fn tweets(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 20)] first: i32,
    ) -> Result<TweetConnection> {
        let state = ctx.data::<GraphQLState>()?;
        let user_id = self
            .inner
            .id
            .ok_or_else(|| async_graphql::Error::new("User missing identifier"))?;

        let limit = first.clamp(1, 50);
        let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
        let user_collection: Collection<User> = state.db.collection("users");
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

        let enriched = enrich_tweets_with_references(tweets, &tweet_collection, &user_collection)
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
            total_count: self.inner.tweets_count.into(),
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

        let state = ctx.data::<GraphQLState>()?;
        let collection: Collection<Follow> = state.db.collection("follows");

        let exists = collection
            .find_one(doc! {"follower_id": viewer_object_id, "following_id": user_id})
            .await
            .map_err(|e| async_graphql::Error::new(e.to_string()))?;

        Ok(exists.is_some())
    }
}

// ============================================================================
// Supporting Types
// ============================================================================

#[derive(SimpleObject, Default, Clone)]
pub struct TokenBalancesSummary {
    pub dooler: i64,
    pub usdc: i64,
    pub bling: i64,
    pub sol: i64,
}

#[derive(Clone)]
pub struct AssetNode {
    pub inner: Asset,
}

#[Object]
impl AssetNode {
    async fn id(&self) -> Option<ID> {
        self.inner.id.map(|id| ID::from(id.to_hex()))
    }

    async fn owner_id(&self) -> ID {
        ID::from(self.inner.owner_id.to_hex())
    }

    async fn name(&self) -> Option<&str> {
        self.inner.item.as_ref().map(|item| item.name.as_str())
    }

    async fn description(&self) -> Option<&str> {
        self.inner
            .item
            .as_ref()
            .map(|item| item.description.as_str())
    }

    async fn image_url(&self) -> Option<&str> {
        self.inner.item.as_ref().map(|item| item.image_url.as_str())
    }

    async fn item_type(&self) -> Option<String> {
        self.inner
            .item
            .as_ref()
            .and_then(|item| item.item_type_metadata.as_ref())
            .map(|metadata| match metadata {
                crate::models::assets::enums::ItemTypeMetadata::Tool(_) => "Tool",
                crate::models::assets::enums::ItemTypeMetadata::Collectible(_) => "Collectible",
                crate::models::assets::enums::ItemTypeMetadata::Cosmetic(_) => "Cosmetic",
                crate::models::assets::enums::ItemTypeMetadata::Badge(_) => "Badge",
                crate::models::assets::enums::ItemTypeMetadata::Membership(_) => "Membership",
                crate::models::assets::enums::ItemTypeMetadata::Rafflebox(_) => "Rafflebox",
            })
            .map(str::to_string)
    }
}
