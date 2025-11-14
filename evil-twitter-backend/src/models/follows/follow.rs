use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Follow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub follower_id: ObjectId,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub following_id: ObjectId,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FollowRequest {
    pub following_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FollowResponse {
    pub success: bool,
    pub message: String,
    pub is_following: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FollowStats {
    pub followers_count: i32,
    pub following_count: i32,
    pub is_following: bool,
}
