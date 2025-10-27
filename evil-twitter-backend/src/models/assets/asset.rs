use crate::models::assets::enums::{
    BadgeMetadata, CollectibleMetadata, CosmeticMetadata, Item, ItemTypeMetadata,
    MembershipMetadata, RaffleboxMetadata, ToolMetadata,
};
use crate::models::tool::{ToolTarget, ToolType};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Asset {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub owner_id: ObjectId,

    pub tradeable: bool,
    pub item: Option<Item>,
}

pub struct AssetBuilder {
    id: Option<ObjectId>,
    owner_id: String,

    tradeable: bool,
    item: Option<Item>,
}

impl AssetBuilder {
    pub fn new(owner_id: impl Into<String>) -> Self {
        Self {
            id: None,
            owner_id: owner_id.into(),
            tradeable: true,
            item: None,
        }
    }

    pub fn build(self) -> Asset {
        Asset {
            id: Some(ObjectId::new()),
            owner_id: ObjectId::parse_str(&self.owner_id).expect("Invalid owner ID"),
            tradeable: self.tradeable,
            item: self.item,
        }
    }

    pub fn tradeable(mut self, tradeable: bool) -> Self {
        self.tradeable = tradeable;
        self
    }

    // Item builder
    pub fn item(mut self, item: Item) -> Self {
        self.item = Some(item);
        self
    }

    // Helper for building common item types
    pub fn tool_item(
        mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        image_url: impl Into<String>,
        impact: i32,
        degrade_per_use: i32,
        tool_type: ToolType,
        tool_target: ToolTarget,
    ) -> Self {
        self.item = Some(Item {
            name: name.into(),
            description: description.into(),
            image_url: image_url.into(),
            item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                impact: impact,
                degrade_per_use: degrade_per_use,
                tool_type: tool_type,
                tool_target: tool_target,
                health: 100,
                max_health: 100,
            })),
        });
        self
    }

    pub fn collectible_item(
        mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        image_url: impl Into<String>,
        creator: impl Into<String>,
        edition_number: i32,
    ) -> Self {
        self.item = Some(Item {
            name: name.into(),
            description: description.into(),
            image_url: image_url.into(),
            item_type_metadata: Some(ItemTypeMetadata::Collectible(CollectibleMetadata {
                creator: creator.into(),
                edition_number: edition_number,
            })),
        });
        self
    }

    pub fn cosmetic_item(
        mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        image_url: impl Into<String>,
        theme: impl Into<String>,
        color_scheme: impl Into<String>,
    ) -> Self {
        self.item = Some(Item {
            name: name.into(),
            description: description.into(),
            image_url: image_url.into(),
            item_type_metadata: Some(ItemTypeMetadata::Cosmetic(CosmeticMetadata {
                theme: theme.into(),
                color_scheme: color_scheme.into(),
            })),
        });
        self
    }

    pub fn badge_item(
        mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        image_url: impl Into<String>,
        rarity: impl Into<String>,
        achievement_condition: impl Into<String>,
    ) -> Self {
        self.item = Some(Item {
            name: name.into(),
            description: description.into(),
            image_url: image_url.into(),
            item_type_metadata: Some(ItemTypeMetadata::Badge(BadgeMetadata {
                rarity: rarity.into(),
                achievement_condition: achievement_condition.into(),
            })),
        });
        self
    }

    pub fn membership_item(
        mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        image_url: impl Into<String>,
        level: impl Into<String>,
        privileges: impl Into<Vec<String>>,
    ) -> Self {
        self.item = Some(Item {
            name: name.into(),
            description: description.into(),
            image_url: image_url.into(),
            item_type_metadata: Some(ItemTypeMetadata::Membership(MembershipMetadata {
                level: level.into(),
                privileges: privileges.into(),
            })),
        });
        self
    }

    pub fn rafflebox_item(
        mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        image_url: impl Into<String>,
        prizes: impl Into<Vec<String>>,
    ) -> Self {
        self.item = Some(Item {
            name: name.into(),
            description: description.into(),
            image_url: image_url.into(),
            item_type_metadata: Some(ItemTypeMetadata::Rafflebox(RaffleboxMetadata {
                prizes: prizes.into(),
            })),
        });
        self
    }
}
