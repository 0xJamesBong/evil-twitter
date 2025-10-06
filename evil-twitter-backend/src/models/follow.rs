use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Follow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub follower_id: ObjectId,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439012")]
    pub following_id: ObjectId,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateFollow {
    #[schema(example = "507f1f77bcf86cd799439012")]
    pub following_id: String,
}
