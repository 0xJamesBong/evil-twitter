use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Like {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub user_id: ObjectId,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439012")]
    pub tweet_id: ObjectId,
    pub created_at: mongodb::bson::DateTime,
}
