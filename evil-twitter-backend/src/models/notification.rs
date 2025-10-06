use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Notification {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub recipient_id: ObjectId,

    #[schema(example = "507f1f77bcf86cd799439012")]
    pub sender_id: ObjectId,

    #[schema(example = "like")]
    pub notification_type: String, // "like", "retweet", "follow", "reply", "mention", "quote"

    #[schema(example = "John Doe liked your tweet")]
    pub message: String,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[schema(example = "false")]
    pub is_read: bool,

    #[schema(example = "false")]
    pub is_archived: bool,

    // Related entities
    #[schema(value_type = String, example = "507f1f77bcf86cd799439013")]
    pub tweet_id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439014")]
    pub reply_id: Option<ObjectId>,

    // Additional data
    #[schema(example = "{}")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateNotification {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub recipient_id: String,

    #[schema(example = "507f1f77bcf86cd799439012")]
    pub sender_id: String,

    #[schema(example = "like")]
    pub notification_type: String,

    #[schema(example = "John Doe liked your tweet")]
    pub message: String,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439013")]
    pub tweet_id: Option<String>,

    #[schema(example = "{}")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationWithSender {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: ObjectId,

    #[schema(example = "like")]
    pub notification_type: String,

    #[schema(example = "John Doe liked your tweet")]
    pub message: String,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[schema(example = "false")]
    pub is_read: bool,

    // Sender information
    #[schema(value_type = String, example = "507f1f77bcf86cd799439012")]
    pub sender_id: ObjectId,

    #[schema(example = "johndoe")]
    pub sender_username: String,

    #[schema(example = "John Doe")]
    pub sender_display_name: String,

    #[schema(example = "https://example.com/avatar.jpg")]
    pub sender_avatar_url: Option<String>,

    // Related tweet (if applicable)
    #[schema(value_type = String, example = "507f1f77bcf86cd799439013")]
    pub tweet_id: Option<ObjectId>,

    #[schema(example = "Hello, world!")]
    pub tweet_content: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MarkNotificationRead {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub notification_id: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MarkAllNotificationsRead {
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub before_date: Option<DateTime>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationStats {
    #[schema(example = "0")]
    pub unread_count: i32,

    #[schema(example = "0")]
    pub total_count: i32,

    #[schema(example = "0")]
    pub likes_count: i32,

    #[schema(example = "0")]
    pub retweets_count: i32,

    #[schema(example = "0")]
    pub follows_count: i32,

    #[schema(example = "0")]
    pub replies_count: i32,

    #[schema(example = "0")]
    pub mentions_count: i32,
}
