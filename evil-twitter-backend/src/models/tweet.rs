use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::models::tool::Tool;

/// Core tweet variants supported by the platform.
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, ToSchema)]
pub enum TweetType {
    Original,
    Retweet,
    Quote,
    Reply,
}

/// Tweet document stored in MongoDB.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Tweet {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub owner_id: ObjectId,

    #[schema(example = "Hello, world! This is my first tweet.")]
    pub content: String,

    #[schema(example = "Original")]
    pub tweet_type: TweetType,

    #[serde(default)]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439012")]
    pub quoted_tweet_id: Option<ObjectId>,

    #[serde(default)]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439013")]
    pub replied_to_tweet_id: Option<ObjectId>,

    #[serde(default)]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439014")]
    pub root_tweet_id: Option<ObjectId>,

    #[schema(example = "0")]
    pub reply_depth: i32,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(default)]
    #[schema(example = "2024-01-02T12:34:56Z")]
    pub updated_at: Option<DateTime>,

    #[serde(default)]
    pub metrics: TweetMetrics,

    #[serde(default)]
    pub author_snapshot: TweetAuthorSnapshot,

    #[serde(default)]
    pub viewer_context: TweetViewerContext,

    #[serde(default)]
    pub energy_state: TweetEnergyState,
}

/// Aggregated engagement data tracked for each tweet.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetMetrics {
    #[schema(example = "0")]
    pub likes: i64,

    #[schema(example = "0")]
    pub retweets: i64,

    #[schema(example = "0")]
    pub quotes: i64,

    #[schema(example = "0")]
    pub replies: i64,

    #[schema(example = "0")]
    pub impressions: i64,

    #[serde(default)]
    #[schema(example = "0")]
    pub smacks: i64,
}

impl TweetMetrics {
    pub fn inc_like(&mut self) {
        self.likes += 1;
    }

    pub fn inc_retweet(&mut self) {
        self.retweets += 1;
    }

    pub fn inc_quote(&mut self) {
        self.quotes += 1;
    }

    pub fn inc_reply(&mut self) {
        self.replies += 1;
    }

    pub fn touch_impression(&mut self) {
        self.impressions += 1;
    }

    pub fn inc_smack(&mut self) {
        self.smacks += 1;
    }
}

impl Default for TweetMetrics {
    fn default() -> Self {
        Self {
            likes: 0,
            retweets: 0,
            quotes: 0,
            replies: 0,
            impressions: 0,
            smacks: 0,
        }
    }
}

/// Snapshot of author metadata stored with the tweet for quick access.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetAuthorSnapshot {
    #[serde(default)]
    #[schema(example = "johndoe")]
    pub username: Option<String>,

    #[serde(default)]
    #[schema(example = "John Doe")]
    pub display_name: Option<String>,

    #[serde(default)]
    #[schema(example = "https://example.com/avatar.jpg")]
    pub avatar_url: Option<String>,
}

impl Default for TweetAuthorSnapshot {
    fn default() -> Self {
        Self {
            username: None,
            display_name: None,
            avatar_url: None,
        }
    }
}

/// Viewer-specific toggles that can be computed on demand.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetViewerContext {
    #[schema(example = "false")]
    pub is_liked: bool,

    #[schema(example = "false")]
    pub is_retweeted: bool,

    #[schema(example = "false")]
    pub is_quoted: bool,
}

impl Default for TweetViewerContext {
    fn default() -> Self {
        Self {
            is_liked: false,
            is_retweeted: false,
            is_quoted: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetEnergyState {
    #[schema(example = "0.0")]
    pub energy: f64, // E_t (dynamic)
    #[schema(example = "0.0")]
    pub kinetic_energy: f64, // K_t (dynamic) // ½mv²
    #[schema(example = "0.0")]
    pub potential_energy: f64, // U_t (dynamic) // mgy
    #[schema(example = "0.0")]
    pub energy_gained_from_support: f64, //
    #[schema(example = "0.0")]
    pub energy_lost_from_attacks: f64, // Δ
    #[schema(example = "0.0")]
    pub mass: f64, // m_t (dynamic)
    #[schema(example = "0.0")]
    pub velocity_initial: f64, // this will never change in the lifetime of a tweet
    #[schema(example = "0.0")]
    pub height_initial: f64, // y_0 (initial) - this will never change in the liftime of a tweet
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub last_update_timestamp: DateTime,
    #[serde(default)]
    pub history: TweetEnergyStateHistory,
}

impl Default for TweetEnergyState {
    fn default() -> Self {
        Self {
            energy: 0.0,
            kinetic_energy: 0.0,
            potential_energy: 0.0,

            energy_gained_from_support: 0.0,
            energy_lost_from_attacks: 0.0,
            mass: 0.0,
            velocity_initial: 0.0,
            height_initial: 0.0,
            last_update_timestamp: DateTime::now(),
            history: TweetEnergyStateHistory::default(),
        }
    }
}
pub const GRAVITY: f64 = 9.81;
impl TweetEnergyState {
    pub fn calc_total_energy(&self) -> f64 {
        // E = ½mv² + mgy - attacks + support
        self.kinetic_energy + self.potential_energy + self.energy_gained_from_support
            - self.energy_lost_from_attacks
    }
    fn update_energy(&mut self) {
        self.kinetic_energy = 0.5 * self.mass * self.velocity_initial.powi(2);
        self.potential_energy = self.mass * self.height_initial * GRAVITY;
        self.energy = self.kinetic_energy + self.potential_energy + self.energy_gained_from_support
            - self.energy_lost_from_attacks;
        self.last_update_timestamp = DateTime::now();
    }

    pub fn record_support(&mut self, action: TweetSupportAction) {
        self.energy_gained_from_support += action.impact;
        self.history.support_history.push(action);
        self.update_energy();
    }

    pub fn revert_support(&mut self, impact: f64) {
        self.energy_gained_from_support -= impact;
        if self.energy_gained_from_support < 0.0 {
            self.energy_gained_from_support = 0.0;
        }
        self.update_energy();
    }

    pub fn record_attack(&mut self, action: TweetAttackAction) {
        self.energy_lost_from_attacks += action.impact;
        self.history.attack_history.push(action);
        self.update_energy();
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetEnergyStateHistory {
    #[serde(default)]
    pub support_history: Vec<TweetSupportAction>,
    #[serde(default)]
    pub attack_history: Vec<TweetAttackAction>,
}

impl Default for TweetEnergyStateHistory {
    fn default() -> Self {
        Self {
            support_history: Vec::new(),
            attack_history: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub enum EnergyActionType {
    Attack,
    Support,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetSupportAction {
    pub timestamp: DateTime,
    pub impact: f64, // Energy amount
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub user_id: ObjectId, // Who did the action
    #[serde(default)]
    pub tool: Option<Tool>, // Optional: what weapon/gadget was used
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetAttackAction {
    pub timestamp: DateTime,
    pub impact: f64, // Energy amount
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub user_id: ObjectId, // Who did the action
    #[serde(default)]
    pub tool: Option<Tool>, // Optional: what weapon/gadget was used
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTweet {
    #[schema(example = "Hello, world! This is my first tweet.")]
    pub content: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateReply {
    #[schema(example = "This is a reply!")]
    pub content: String,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub replied_to_tweet_id: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateQuote {
    #[schema(example = "Adding my thoughts to this tweet")]
    pub content: String,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub quoted_tweet_id: String,
}

/// Enriched tweet that includes hydrated references.
#[derive(Debug, Serialize, Clone, ToSchema)]
pub struct TweetView {
    #[serde(flatten)]
    pub tweet: Tweet,

    #[schema(no_recursion)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quoted_tweet: Option<Box<TweetView>>,

    #[schema(no_recursion)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replied_to_tweet: Option<Box<TweetView>>,
}

impl TweetView {
    pub fn from_tweet(tweet: Tweet) -> Self {
        Self {
            tweet,
            quoted_tweet: None,
            replied_to_tweet: None,
        }
    }
}

impl Tweet {
    pub fn is_original(&self) -> bool {
        matches!(self.tweet_type, TweetType::Original)
    }

    pub fn is_retweet(&self) -> bool {
        matches!(self.tweet_type, TweetType::Retweet)
    }

    pub fn is_quote(&self) -> bool {
        matches!(self.tweet_type, TweetType::Quote)
    }

    pub fn is_reply(&self) -> bool {
        matches!(self.tweet_type, TweetType::Reply)
    }

    pub fn thread_root_id(&self) -> Option<ObjectId> {
        self.root_tweet_id.or(self.id)
    }

    // pub fn attack_tweet(&mut self, attacker_user_id: ObjectId, weapon: Option<Tool>) {
    //     // For now, use a default attack amount

    //     // TODO: Implement weapon system to get actual attack values
    //     let attack_amount = if weapon.is_some() {
    //         weapon.clone().unwrap().damage as f64
    //     } else {
    //         1.0 // Basic attack without weapon
    //     };

    //     let action = AttackAction {
    //         timestamp: mongodb::bson::DateTime::now(),
    //         amount: attack_amount,
    //         user_id: attacker_user_id,
    //         weapon: weapon.clone(),
    //     };

    //     // Update energy state
    //     self.energy_state.record_attack(action);
    // }

    // pub fn support_tweet(&mut self, supporter_user_id: ObjectId, weapon: Option<Tool>) {
    //     // For now, use a default attack amount
    //     // TODO: Implement weapon system to get actual attack values
    //     let support_amount = if weapon.is_some() {
    //         weapon.clone().unwrap().damage as f64
    //     } else {
    //         0.0 // Basic attack without weapon
    //     };
    //     let action = SupportAction {
    //         timestamp: mongodb::bson::DateTime::now(),
    //         amount: support_amount,
    //         user_id: supporter_user_id,
    //         weapon: weapon.clone(),
    //     };
    //     self.energy_state.record_support(action);
    // }

    // pub async fn record_energy_change(
    //     &mut self,
    //     db: &mongodb::Database,
    //     action_type: EnergyActionType,
    //     energy_change: f64,
    //     user_id: ObjectId,
    //     weapon_used: Option<String>,
    // ) -> Result<(), Box<dyn std::error::Error>> {
    //     // Update tweet energy state and record the action
    //     match action_type.clone() {
    //         EnergyActionType::Attack => {
    //             let attack_action = AttackAction {
    //                 timestamp: mongodb::bson::DateTime::now(),
    //                 amount: energy_change.abs(), // Store as positive value
    //                 user_id,
    //                 weapon_used,
    //             };
    //             self.energy.record_attack(attack_action);
    //         }
    //         EnergyActionType::Support => {
    //             let support_action = SupportAction {

    //     self.energy.update_energy();

    //     // Save to database
    //     let collection: mongodb::Collection<Tweet> = db.collection("tweets");
    //     collection
    //         .update_one(
    //             mongodb::bson::doc! {"_id": self.id},
    //             mongodb::bson::doc! {"$set": {"energy": mongodb::bson::to_bson(&self.energy)?}},
    //         )
    //         .await?;

    //     Ok(())
    // }
}
