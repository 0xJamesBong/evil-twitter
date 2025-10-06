use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub enum TweetType {
    Original,
    Retweet,
    Quote,
    Reply,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Tweet {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub owner_id: ObjectId,

    #[schema(example = "Hello, world! This is my first tweet.")]
    pub content: String,

    #[schema(example = "original")]
    pub tweet_type: TweetType,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub original_tweet_id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub replied_to_tweet_id: Option<ObjectId>,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[schema(example = "0")]
    pub likes_count: i32,

    #[schema(example = "0")]
    pub retweets_count: i32,

    #[schema(example = "0")]
    pub replies_count: i32,

    #[schema(example = "false")]
    pub is_liked: bool,

    #[schema(example = "false")]
    pub is_retweeted: bool,

    // Author information
    #[schema(example = "johndoe")]
    pub author_username: Option<String>,

    #[schema(example = "John Doe")]
    pub author_display_name: Option<String>,

    #[schema(example = "https://example.com/avatar.jpg")]
    pub author_avatar_url: Option<String>,

    #[schema(example = "100")]
    pub health: i32,
    #[serde(default)]
    pub health_history: TweetHealthHistory,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetHealthHistory {
    pub health: i32,
    pub heal_history: Vec<TweetHealAction>,
    pub attack_history: Vec<TweetAttackAction>,
}

impl Default for TweetHealthHistory {
    fn default() -> Self {
        Self {
            health: 100,
            heal_history: Vec::new(),
            attack_history: Vec::new(),
        }
    }
}
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub enum TweetChangeType {
    Heal,
    Attack,
}
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetChange {
    pub tweet_change_type: TweetChangeType,
    pub timestamp: DateTime,
    pub amount: i32,
    pub health_before: i32,
    pub health_after: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetHealAction {
    pub timestamp: DateTime,
    pub amount: i32,
    pub health_before: i32,
    pub health_after: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TweetAttackAction {
    pub timestamp: DateTime,
    pub amount: i32,
    pub health_before: i32,
    pub health_after: i32,
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
}
