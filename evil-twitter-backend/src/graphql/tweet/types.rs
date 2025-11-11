use async_graphql::{Enum, ID, Object, SimpleObject};

use crate::models::tweet::{TweetMetrics, TweetType, TweetView};
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
