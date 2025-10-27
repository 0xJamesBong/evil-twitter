use crate::models::assets::enums::{Item, ItemTypeMetadata, ToolMetadata};
use crate::models::tool::{ToolTarget, ToolType};

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

// This is for describing the basic items you can buy from the shop - to be

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct CatalogItem {
    pub catalog_id: String,
    pub item: Option<Item>,
    pub price: i32,
}

pub fn get_catalog() -> Vec<CatalogItem> {
    vec![
        CatalogItem {
            catalog_id: "sword_of_truth".to_string(),
            item: Some(Item {
                name: "Sword of Truth".to_string(),
                description: "A legendary blade that cuts through lies and misinformation."
                    .to_string(),
                image_url: "https://example.com/sword.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 30,
                    health: 100,
                    max_health: 100,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 1500,
        },
        CatalogItem {
            catalog_id: "ban_hammer".to_string(),
            item: Some(Item {
                name: "Ban Hammer".to_string(),
                description:
                    "The ultimate moderation tool. One swing can silence the loudest trolls."
                        .to_string(),
                image_url: "https://example.com/hammer.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 40,
                    health: 80,
                    max_health: 80,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 2000,
        },
        CatalogItem {
            catalog_id: "ratio_rifle".to_string(),
            item: Some(Item {
                name: "Ratio Rifle".to_string(),
                description: "Precision weapon that exposes bad takes with surgical accuracy."
                    .to_string(),
                image_url: "https://example.com/rifle.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 25,
                    health: 60,
                    max_health: 60,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 1200,
        },
        CatalogItem {
            catalog_id: "sarcasm_saber".to_string(),
            item: Some(Item {
                name: "Sarcasm Saber".to_string(),
                description: "Cuts deep with witty remarks. Effective against serious takes."
                    .to_string(),
                image_url: "https://example.com/saber.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 20,
                    health: 70,
                    max_health: 70,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 800,
        },
        CatalogItem {
            catalog_id: "cancel_cannon".to_string(),
            item: Some(Item {
                name: "Cancel Cannon".to_string(),
                description: "Fires explosive callouts. Use with caution.".to_string(),
                image_url: "https://example.com/cannon.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 35,
                    health: 50,
                    max_health: 50,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 1800,
        },
        // SHIELDS/DEFENSE
        CatalogItem {
            catalog_id: "echo_chamber_shield".to_string(),
            item: Some(Item {
                name: "Echo Chamber Shield".to_string(),
                description: "Reflects criticism back to sender. Creates a safe space bubble."
                    .to_string(),
                image_url: "https://example.com/shield.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 5,
                    health: 150,
                    max_health: 150,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 1000,
        },
        CatalogItem {
            catalog_id: "block_button".to_string(),
            item: Some(Item {
                name: "Block Button".to_string(),
                description: "Ultimate defense. Makes you invulnerable to haters.".to_string(),
                image_url: "https://example.com/block.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 0,
                    health: 100,
                    max_health: 100,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 900,
        },
        // HEALING/SUPPORT
        CatalogItem {
            catalog_id: "copium_canister".to_string(),
            item: Some(Item {
                name: "Copium Canister".to_string(),
                description: "Emergency healing item. Helps you cope with bad engagement metrics."
                    .to_string(),
                image_url: "https://example.com/copium.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 30,
                    health: 50,
                    max_health: 50,
                    degrade_per_use: 1,
                    tool_type: ToolType::Support,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 500,
        },
        // GADGETS/UTILITY
        CatalogItem {
            catalog_id: "viral_amplifier".to_string(),
            item: Some(Item {
                name: "Viral Amplifier".to_string(),
                description: "Boosts tweet reach. Increases retweet probability by 50%."
                    .to_string(),
                image_url: "https://example.com/amplifier.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 10,
                    health: 40,
                    max_health: 40,
                    degrade_per_use: 1,
                    tool_type: ToolType::Support,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 2500,
        },
        CatalogItem {
            catalog_id: "algorithm_manipulator".to_string(),
            item: Some(Item {
                name: "Algorithm Manipulator".to_string(),
                description: "Hacks the timeline algorithm. Your tweets appear first.".to_string(),
                image_url: "https://example.com/algorithm.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 0,
                    health: 30,
                    max_health: 30,
                    degrade_per_use: 1,
                    tool_type: ToolType::Support,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 3000,
        },
        CatalogItem {
            catalog_id: "engagement_bait".to_string(),
            item: Some(Item {
                name: "Engagement Bait".to_string(),
                description: "Generates controversial takes that guarantee replies.".to_string(),
                image_url: "https://example.com/bait.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 5,
                    health: 50,
                    max_health: 50,
                    degrade_per_use: 1,
                    tool_type: ToolType::Support,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 700,
        },
        CatalogItem {
            catalog_id: "mute_button".to_string(),
            item: Some(Item {
                name: "Mute Button".to_string(),
                description: "Silences annoying discourse. Peaceful timeline guaranteed."
                    .to_string(),
                image_url: "https://example.com/mute.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 15,
                    health: 70,
                    max_health: 70,
                    degrade_per_use: 1,
                    tool_type: ToolType::Support,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 400,
        },
        CatalogItem {
            catalog_id: "quote_tweet_sniper".to_string(),
            item: Some(Item {
                name: "Quote Tweet Sniper".to_string(),
                description: "Perfect for dunking from a distance. High precision, maximum ratio."
                    .to_string(),
                image_url: "https://example.com/sniper.png".to_string(),
                item_type_metadata: Some(ItemTypeMetadata::Tool(ToolMetadata {
                    impact: 28,
                    health: 65,
                    max_health: 65,
                    degrade_per_use: 1,
                    tool_type: ToolType::Weapon,
                    tool_target: ToolTarget::Tweet,
                })),
            }),
            price: 1400,
        },
    ]
}

pub fn get_catalog_item_by_id(id: &str) -> Option<CatalogItem> {
    get_catalog().into_iter().find(|item| item.catalog_id == id)
}
