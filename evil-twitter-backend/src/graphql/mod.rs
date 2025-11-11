use async_graphql::{
    Context, EmptyMutation, EmptySubscription, Enum, ID, InputObject, Object, Result, Schema,
    SimpleObject,
};
use axum::Json;
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};

use crate::{
    models::{
        assets::asset::Asset,
        follow::Follow,
        tokens::{enums::TokenType, token_balance::TokenBalance},
        tweet::{Tweet, TweetMetrics, TweetType, TweetView},
        user::User,
    },
    routes::tweet::{
        ApiError, TweetThreadResponse, assemble_thread_response, enrich_tweets_with_references,
    },
};

#[derive(Clone)]
pub struct GraphQLState {
    pub db: Database,
}

#[derive(Default)]
pub struct QueryRoot;

pub type AppSchema = Schema<QueryRoot, EmptyMutation, EmptySubscription>;

pub fn build_schema(db: Database) -> AppSchema {
    Schema::build(QueryRoot::default(), EmptyMutation, EmptySubscription)
        .data(GraphQLState { db })
        .limit_complexity(1_000)
        .limit_depth(10)
        .finish()
}

#[Object]
impl QueryRoot {
    /// Fetch a single user by identifier with optional nested resources.
    async fn user(&self, ctx: &Context<'_>, id: ID) -> Result<Option<UserNode>> {
        let state = ctx.data::<GraphQLState>()?;
        let object_id = parse_object_id(&id)?;
        let collection: Collection<User> = state.db.collection("users");

        let user = collection
            .find_one(doc! {"_id": object_id})
            .await
            .map_err(map_mongo_error)?;

        Ok(user.map(UserNode::from))
    }

    /// Flexible user search for discovery surfaces.
    async fn search_users(
        &self,
        ctx: &Context<'_>,
        query: String,
        #[graphql(default = 10)] limit: i32,
    ) -> Result<Vec<UserNode>> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let limit = limit.clamp(1, 50);
        let state = ctx.data::<GraphQLState>()?;
        let collection: Collection<User> = state.db.collection("users");

        let filter = doc! {
            "$or": [
                {"username": {"$regex": &query, "$options": "i"}},
                {"display_name": {"$regex": &query, "$options": "i"}}
            ]
        };

        let mut cursor = collection
            .find(filter)
            .sort(doc! {"followers_count": -1})
            .limit(i64::from(limit))
            .await
            .map_err(map_mongo_error)?;

        let mut results = Vec::new();
        while let Some(user) = cursor.try_next().await.map_err(map_mongo_error)? {
            results.push(UserNode::from(user));
        }

        Ok(results)
    }

    /// Curated discovery feed with optional filters and sorting.
    async fn discover_users(
        &self,
        ctx: &Context<'_>,
        filters: Option<DiscoverFilters>,
    ) -> Result<Vec<UserNode>> {
        let filters = filters.unwrap_or_default();
        let state = ctx.data::<GraphQLState>()?;
        let collection: Collection<User> = state.db.collection("users");

        let mut filter_doc = doc! {};
        if let Some(min_followers) = filters.min_followers {
            filter_doc.insert("followers_count", doc! {"$gte": min_followers});
        }
        if let Some(min_tweets) = filters.min_tweets {
            filter_doc.insert("tweets_count", doc! {"$gte": min_tweets});
        }

        let sort_field = filters
            .sort_by
            .map(|sort| sort.field_name())
            .unwrap_or("followers_count");

        let limit = filters.limit.unwrap_or(10).clamp(1, 50);

        let mut cursor = collection
            .find(filter_doc)
            .sort(doc! {sort_field: -1})
            .limit(i64::from(limit))
            .await
            .map_err(map_mongo_error)?;

        let mut results = Vec::new();
        while let Some(user) = cursor.try_next().await.map_err(map_mongo_error)? {
            results.push(UserNode::from(user));
        }

        Ok(results)
    }

    /// Hydrated tweet thread with parents and replies.
    async fn tweet_thread(&self, ctx: &Context<'_>, tweet_id: ID) -> Result<TweetThreadNode> {
        let state = ctx.data::<GraphQLState>()?;
        let object_id = parse_object_id(&tweet_id)?;

        let response = assemble_thread_response(&state.db, object_id)
            .await
            .map_err(api_error_to_graphql)?;

        Ok(TweetThreadNode::from(response))
    }

    // Main timeline feed of tweets
    async fn timeline(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 20)] first: i32,
        #[graphql(default = "")] after: String, // For cursor paginatio
    ) -> Result<TweetConnection> {
        let limit = first.clamp(1, 50);
        let state = ctx.data::<GraphQLState>()?;
        let tweet_collection: Collection<Tweet> = state.db.collection("tweets");
        let user_collection: Collection<User> = state.db.collection("users");
        // Build query - similar to REST get_tweets
        let mut cursor = tweet_collection
            .find(doc! {})
            .sort(doc! {"created_at": -1})
            .limit(i64::from(limit))
            .await
            .map_err(map_mongo_error)?;

        let mut tweets = Vec::new();
        while let Some(tweet) = cursor.try_next().await.map_err(map_mongo_error)? {
            tweets.push(tweet);
        }
        let enriched = enrich_tweets_with_references(tweets, &tweet_collection, &user_collection)
            .await
            .map_err(map_api_error)?;

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
            edges: edges.clone(),
            total_count: edges.len() as i64,
        })
    }
}

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
    fn field_name(&self) -> &'static str {
        match self {
            DiscoverSort::Followers => "followers_count",
            DiscoverSort::Tweets => "tweets_count",
            DiscoverSort::DollarRate => "dollar_conversion_rate",
        }
    }
}

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
            .map_err(map_mongo_error)?;

        let mut summary = TokenBalancesSummary::default();
        while let Some(balance) = cursor.try_next().await.map_err(map_mongo_error)? {
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
            .map_err(map_mongo_error)?;

        let mut assets = Vec::new();
        while let Some(asset) = cursor.try_next().await.map_err(map_mongo_error)? {
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
            .map_err(map_mongo_error)?;

        let mut tweets = Vec::new();
        while let Some(tweet) = cursor.try_next().await.map_err(map_mongo_error)? {
            tweets.push(tweet);
        }

        let enriched = enrich_tweets_with_references(tweets, &tweet_collection, &user_collection)
            .await
            .map_err(map_api_error)?;

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

        let viewer_object_id = parse_object_id(&viewer_id)?;
        let user_id = self
            .inner
            .id
            .ok_or_else(|| async_graphql::Error::new("User missing identifier"))?;

        let state = ctx.data::<GraphQLState>()?;
        let collection: Collection<Follow> = state.db.collection("follows");

        let exists = collection
            .find_one(doc! {"follower_id": viewer_object_id, "following_id": user_id})
            .await
            .map_err(map_mongo_error)?;

        Ok(exists.is_some())
    }
}

#[derive(SimpleObject, Default, Clone)]
pub struct TokenBalancesSummary {
    pub dooler: i64,
    pub usdc: i64,
    pub bling: i64,
    pub sol: i64,
}

#[derive(Clone)]
pub struct AssetNode {
    inner: Asset,
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

#[derive(SimpleObject, Clone)]
pub struct TweetConnection {
    pub edges: Vec<TweetEdge>,
    pub total_count: i64,
}

#[derive(SimpleObject, Clone)]
pub struct TweetEdge {
    pub cursor: ID,
    pub node: TweetNode,
}

#[derive(Clone)]
pub struct TweetNode {
    view: TweetView,
}

impl From<TweetView> for TweetNode {
    fn from(view: TweetView) -> Self {
        Self { view }
    }
}

#[Object]
impl TweetNode {
    async fn id(&self) -> Option<ID> {
        self.view.tweet.id.map(|id| ID::from(id.to_hex()))
    }

    async fn owner_id(&self) -> ID {
        ID::from(self.view.tweet.owner_id.to_hex())
    }

    async fn content(&self) -> &str {
        &self.view.tweet.content
    }

    async fn tweet_type(&self) -> TweetTypeOutput {
        TweetTypeOutput::from(self.view.tweet.tweet_type)
    }

    async fn metrics(&self) -> TweetMetricsObject {
        TweetMetricsObject::from(self.view.tweet.metrics.clone())
    }

    async fn energy_state(&self) -> TweetEnergyStateObject {
        TweetEnergyStateObject::from(self.view.tweet.energy_state.clone())
    }

    async fn author(&self) -> AuthorSnapshotObject {
        AuthorSnapshotObject::from(self.view.tweet.author_snapshot.clone())
    }

    async fn quoted_tweet(&self) -> Option<TweetNode> {
        self.view
            .quoted_tweet
            .as_ref()
            .map(|boxed| TweetNode::from((**boxed).clone()))
    }

    async fn replied_to_tweet(&self) -> Option<TweetNode> {
        self.view
            .replied_to_tweet
            .as_ref()
            .map(|boxed| TweetNode::from((**boxed).clone()))
    }

    async fn root_tweet_id(&self) -> Option<ID> {
        self.view
            .tweet
            .root_tweet_id
            .map(|id| ID::from(id.to_hex()))
    }

    async fn quoted_tweet_id(&self) -> Option<ID> {
        self.view
            .tweet
            .quoted_tweet_id
            .map(|id| ID::from(id.to_hex()))
    }

    async fn replied_to_tweet_id(&self) -> Option<ID> {
        self.view
            .tweet
            .replied_to_tweet_id
            .map(|id| ID::from(id.to_hex()))
    }

    async fn updated_at(&self) -> Option<String> {
        self.view
            .tweet
            .updated_at
            .map(|ts| ts.to_chrono().to_rfc3339())
    }

    async fn created_at(&self) -> String {
        self.view.tweet.created_at.to_chrono().to_rfc3339()
    }

    async fn reply_depth(&self) -> i32 {
        self.view.tweet.reply_depth
    }
}

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum TweetTypeOutput {
    Original,
    Retweet,
    Quote,
    Reply,
}

impl From<TweetType> for TweetTypeOutput {
    fn from(value: TweetType) -> Self {
        match value {
            TweetType::Original => TweetTypeOutput::Original,
            TweetType::Retweet => TweetTypeOutput::Retweet,
            TweetType::Quote => TweetTypeOutput::Quote,
            TweetType::Reply => TweetTypeOutput::Reply,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct TweetMetricsObject {
    pub likes: i64,
    pub retweets: i64,
    pub quotes: i64,
    pub replies: i64,
    pub impressions: i64,
    pub smacks: i64,
}

impl From<TweetMetrics> for TweetMetricsObject {
    fn from(metrics: TweetMetrics) -> Self {
        Self {
            likes: metrics.likes,
            retweets: metrics.retweets,
            quotes: metrics.quotes,
            replies: metrics.replies,
            impressions: metrics.impressions,
            smacks: metrics.smacks,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct TweetEnergyStateObject {
    pub energy: f64,
    pub kinetic_energy: f64,
    pub potential_energy: f64,
    pub energy_gained_from_support: f64,
    pub energy_lost_from_attacks: f64,
    pub mass: f64,
    pub velocity_initial: f64,
    pub height_initial: f64,
}

impl From<crate::models::tweet::TweetEnergyState> for TweetEnergyStateObject {
    fn from(state: crate::models::tweet::TweetEnergyState) -> Self {
        Self {
            energy: state.energy,
            kinetic_energy: state.kinetic_energy,
            potential_energy: state.potential_energy,
            energy_gained_from_support: state.energy_gained_from_support,
            energy_lost_from_attacks: state.energy_lost_from_attacks,
            mass: state.mass,
            velocity_initial: state.velocity_initial,
            height_initial: state.height_initial,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct AuthorSnapshotObject {
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

impl From<crate::models::tweet::TweetAuthorSnapshot> for AuthorSnapshotObject {
    fn from(snapshot: crate::models::tweet::TweetAuthorSnapshot) -> Self {
        Self {
            username: snapshot.username,
            display_name: snapshot.display_name,
            avatar_url: snapshot.avatar_url,
        }
    }
}

pub struct TweetThreadNode {
    tweet: TweetNode,
    parents: Vec<TweetNode>,
    replies: Vec<TweetNode>,
}

impl From<TweetThreadResponse> for TweetThreadNode {
    fn from(response: TweetThreadResponse) -> Self {
        let tweet = TweetNode::from(response.tweet);
        let parents = response.parents.into_iter().map(TweetNode::from).collect();
        let replies = response.replies.into_iter().map(TweetNode::from).collect();
        Self {
            tweet,
            parents,
            replies,
        }
    }
}

#[Object]
impl TweetThreadNode {
    async fn tweet(&self) -> &TweetNode {
        &self.tweet
    }

    async fn parents(&self) -> &Vec<TweetNode> {
        &self.parents
    }

    async fn replies(&self) -> &Vec<TweetNode> {
        &self.replies
    }
}

fn parse_object_id(id: &ID) -> Result<ObjectId> {
    ObjectId::parse_str(id.as_str()).map_err(|_| async_graphql::Error::new("Invalid ObjectId"))
}

fn map_mongo_error(err: mongodb::error::Error) -> async_graphql::Error {
    async_graphql::Error::new(err.to_string())
}

fn map_api_error(err: ApiError) -> async_graphql::Error {
    let (status, Json(body)) = err;
    let message = body
        .get("error")
        .and_then(|value| value.as_str())
        .or_else(|| body.get("message").and_then(|value| value.as_str()))
        .unwrap_or("Unknown error");
    async_graphql::Error::new(format!("{message} (status {status})"))
}

fn api_error_to_graphql(err: ApiError) -> async_graphql::Error {
    map_api_error(err)
}
