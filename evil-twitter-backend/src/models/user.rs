use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(example = "123e4567-e89b-12d3-a456-426614174000")]
    pub supabase_id: String,

    #[schema(example = "johndoe")]
    pub username: String,

    #[schema(example = "John Doe")]
    pub display_name: String,

    #[schema(example = "john@example.com")]
    pub email: String,

    #[schema(example = "https://example.com/avatar.jpg")]
    pub avatar_url: Option<String>,

    #[schema(example = "Software developer passionate about Rust")]
    pub bio: Option<String>,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[schema(example = "0")]
    pub followers_count: i32,

    #[schema(example = "0")]
    pub following_count: i32,

    #[schema(example = "0")]
    pub tweets_count: i32,

    #[serde(default)]
    #[schema(example = "0")]
    pub intimate_followers_count: i32,

    #[serde(default)]
    #[schema(example = "0")]
    pub intimate_follow_requests_count: i32,

    #[schema(example = "10000")]
    pub dollar_conversion_rate: i32,

    // optional: you can store weapon ids for fast lookup
    #[serde(default)]
    #[schema(value_type = Vec<String>)]
    pub weapon_ids: Vec<ObjectId>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateUser {
    #[schema(example = "123e4567-e89b-12d3-a456-426614174000")]
    pub supabase_id: String,

    #[schema(example = "johndoe")]
    pub username: String,

    #[schema(example = "John Doe")]
    pub display_name: String,

    #[schema(example = "john@example.com")]
    pub email: String,

    #[schema(example = "https://example.com/avatar.jpg")]
    pub avatar_url: Option<String>,

    #[schema(example = "Software developer passionate about Rust")]
    pub bio: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ImproveRateRequest {
    #[schema(example = "100", minimum = 1, maximum = 1000)]
    pub amount: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AttackRateRequest {
    #[schema(example = "50", minimum = 1, maximum = 1000)]
    pub amount: i32,
}
