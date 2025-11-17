use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, ToSchema)]
pub enum ProfileStatus {
    Active,
    Suspended,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Profile {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(example = "did:privy:abc123")]
    pub user_id: String, // Privy DID

    #[schema(example = "johndoe")]
    pub handle: String,

    #[schema(example = "John Doe")]
    pub display_name: String,

    #[schema(example = "https://example.com/avatar.jpg")]
    pub avatar_url: Option<String>,

    #[schema(example = "Software developer passionate about Rust")]
    pub bio: Option<String>,

    #[schema(example = "Active")]
    pub status: ProfileStatus,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,
}

impl Profile {
    pub const COLLECTION_NAME: &str = "profiles";
}
