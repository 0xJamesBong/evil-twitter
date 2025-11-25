use async_graphql::{Context, Enum, ID, Object, Result, SimpleObject};
use std::sync::Arc;
use mongodb::bson::doc;

use crate::app_state::AppState;
use crate::graphql::user::types::ProfileNode;
use crate::models::tweet::{TweetMetrics, TweetType, TweetView};
use crate::models::post_state::PostState;
use crate::utils::tweet::TweetThreadResponse;

// ============================================================================
// Connection Types
// ============================================================================

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

// ============================================================================
// Tweet Node
// ============================================================================

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

    /// Get the author's profile (fetched on demand)
    async fn author(&self, ctx: &Context<'_>) -> Result<Option<ProfileNode>> {
        let app_state = ctx.data::<Arc<AppState>>()?;

        // Get the user by owner_id
        let user = app_state
            .mongo_service
            .users
            .get_user_by_id(self.view.tweet.owner_id)
            .await?;

        let user = match user {
            Some(u) => u,
            None => return Ok(None),
        };

        // Get the profile by privy_id
        let profile = app_state
            .mongo_service
            .profiles
            .get_profile_by_user_id(&user.privy_id)
            .await?;

        Ok(profile.map(ProfileNode::from))
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

    /// Get post state from on-chain data (cached in MongoDB)
    async fn post_state(&self, ctx: &Context<'_>) -> Result<Option<PostStateNode>> {
        let app_state = ctx.data::<Arc<AppState>>()?;
        
        // Only fetch post state if tweet has a post_id_hash
        let post_id_hash = match &self.view.tweet.post_id_hash {
            Some(hash) => hash,
            None => return Ok(None),
        };

        // Fetch from MongoDB post_states collection
        let post_states_collection: mongodb::Collection<PostState> = 
            app_state.mongo_service.db().collection(PostState::COLLECTION_NAME);
        
        let post_state = post_states_collection
            .find_one(doc! { "post_id_hash": post_id_hash })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to fetch post state: {}", e)))?;

        Ok(post_state.map(PostStateNode::from))
    }

    /// Get post ID hash
    async fn post_id_hash(&self) -> Option<String> {
        self.view.tweet.post_id_hash.clone()
    }
}

// ============================================================================
// Enums
// ============================================================================

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

// ============================================================================
// Post State Node
// ============================================================================

#[derive(SimpleObject, Clone)]
pub struct PostStateNode {
    pub state: String,
    pub upvotes: u64,
    pub downvotes: u64,
    pub winning_side: Option<String>,
    pub end_time: i64,
}

impl From<PostState> for PostStateNode {
    fn from(state: PostState) -> Self {
        Self {
            state: state.state,
            upvotes: state.upvotes,
            downvotes: state.downvotes,
            winning_side: state.winning_side,
            end_time: state.end_time,
        }
    }
}

// ============================================================================
// Object Types
// ============================================================================

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

// ============================================================================
// Thread Node
// ============================================================================

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
