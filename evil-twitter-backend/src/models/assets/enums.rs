use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::models::tool::{ToolTarget, ToolType};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TokenType {
    Dooler,
    Usdc,
    Sol,
    Bling,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Item {
    pub name: String,
    pub description: String,
    pub image_url: String,
    // the type-specific data
    pub item_type_metadata: Option<ItemTypeMetadata>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(tag = "type", content = "data")]
pub enum ItemTypeMetadata {
    Tool(ToolMetadata),
    Collectible(CollectibleMetadata),
    Cosmetic(CosmeticMetadata),
    Badge(BadgeMetadata),
    Membership(MembershipMetadata),
    Rafflebox(RaffleboxMetadata),
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct ToolMetadata {
    pub impact: i32,
    pub health: i32,
    pub max_health: i32,
    pub degrade_per_use: i32,
    pub tool_type: ToolType,
    pub tool_target: ToolTarget,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct CollectibleMetadata {
    pub creator: String,
    pub edition_number: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct BadgeMetadata {
    pub rarity: String,
    pub achievement_condition: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct CosmeticMetadata {
    pub theme: String,
    pub color_scheme: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct MembershipMetadata {
    pub level: String,
    pub privileges: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct RaffleboxMetadata {
    pub prizes: Vec<String>,
}
