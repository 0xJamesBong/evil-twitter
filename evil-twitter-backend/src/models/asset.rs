use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AssetType {
    Tool,
    Reward,
    Honor,
    Collectible,
    Badge,
    Other,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AssetStatus {
    Active,
    Listed,
    Locked,
    Burned,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Asset {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub owner_id: String,

    pub asset_type: AssetType,

    #[schema(example = "Lucifer's Flaming Sword")]
    pub name: String,

    #[schema(example = "Born in the deepest hell, forged in flame.")]
    pub description: Option<String>,

    #[schema(example = "https://cdn.evil-twitter.com/assets/flaming-sword.png")]
    pub media_url: Option<String>,

    /// Arbitrary JSON properties for frontends or future metadata
    #[schema(value_type = Object)]
    pub attributes: Option<serde_json::Value>,

    #[serde(default)]
    #[schema(example = "true")]
    pub tradeable: bool,

    #[serde(default)]
    #[schema(example = "false")]
    pub is_locked: bool,

    pub status: AssetStatus,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub updated_at: DateTime,
}

impl Asset {
    pub fn new(
        owner_id: impl Into<String>,
        asset_type: AssetType,
        name: impl Into<String>,
    ) -> Self {
        Asset {
            id: None,
            owner_id: owner_id.into(),
            asset_type,
            name: name.into(),
            description: None,
            media_url: None,
            attributes: None,
            tradeable: true,
            is_locked: false,
            status: AssetStatus::Active,
            created_at: DateTime::now(),
            updated_at: DateTime::now(),
        }
    }
}
