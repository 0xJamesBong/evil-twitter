// use serde::{Deserialize, Serialize};
// use utoipa::ToSchema;
// use crate::models::tool::{ToolType, ToolTarget};

// #[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
// pub struct WeaponCatalogItem {
//     #[schema(example = "sword_of_truth")]
//     pub id: String,

//     #[schema(example = "Sword of Truth")]
//     pub name: String,

//     #[schema(example = "⚔️")]
//     pub emoji: String,

//     #[schema(example = "A legendary blade that cuts through lies and misinformation")]
//     pub description: String,

//     #[schema(example = "https://example.com/sword.png")]
//     pub image_url: String,

//     pub tool_type: ToolType,
//     pub tool_target: ToolTarget,

//     #[schema(example = 25)]
//     pub impact: i32,

//     #[schema(example = 100)]
//     pub health: i32,

//     #[schema(example = 100)]
//     pub max_health: i32,

//     #[schema(example = 1)]
//     pub degrade_per_use: i32,

//     #[schema(example = 1000)]
//     pub price: i32,

//     #[schema(example = "rare")]
//     pub rarity: String,
// }

// // Predefined weapon catalog
// pub fn get_weapon_catalog() -> Vec<WeaponCatalogItem> {
//     vec![
//         // WEAPONS
//         WeaponCatalogItem {
//             id: "sword_of_truth".to_string(),
//             name: "Sword of Truth".to_string(),
//             emoji: "⚔️".to_string(),
//             description: "A legendary blade that cuts through lies and misinformation. Deals devastating damage to false narratives.".to_string(),
//             image_url: "https://example.com/sword.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 30,
//             health: 100,
//             max_health: 100,
//             degrade_per_use: 1,
//             price: 1500,
//             rarity: "legendary".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "ban_hammer".to_string(),
//             name: "Ban Hammer".to_string(),
//             emoji: "🔨".to_string(),
//             description: "The ultimate moderation tool. One swing can silence the loudest trolls.".to_string(),
//             image_url: "https://example.com/hammer.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 40,
//             health: 80,
//             max_health: 80,
//             degrade_per_use: 1,
//             price: 2000,
//             rarity: "legendary".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "ratio_rifle".to_string(),
//             name: "Ratio Rifle".to_string(),
//             emoji: "🔫".to_string(),
//             description: "Precision weapon that exposes bad takes with surgical accuracy.".to_string(),
//             image_url: "https://example.com/rifle.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 25,
//             health: 60,
//             max_health: 60,
//             degrade_per_use: 1,
//             price: 1200,
//             rarity: "rare".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "sarcasm_saber".to_string(),
//             name: "Sarcasm Saber".to_string(),
//             emoji: "🗡️".to_string(),
//             description: "Cuts deep with witty remarks. Effective against serious takes.".to_string(),
//             image_url: "https://example.com/saber.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 20,
//             health: 70,
//             max_health: 70,
//             degrade_per_use: 1,
//             price: 800,
//             rarity: "uncommon".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "cancel_cannon".to_string(),
//             name: "Cancel Cannon".to_string(),
//             emoji: "💥".to_string(),
//             description: "Fires explosive callouts. Use with caution.".to_string(),
//             image_url: "https://example.com/cannon.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 35,
//             health: 50,
//             max_health: 50,
//             degrade_per_use: 1,
//             price: 1800,
//             rarity: "rare".to_string(),
//         },

//         // SHIELDS/DEFENSE
//         WeaponCatalogItem {
//             id: "echo_chamber_shield".to_string(),
//             name: "Echo Chamber Shield".to_string(),
//             emoji: "🛡️".to_string(),
//             description: "Reflects criticism back to sender. Creates a safe space bubble.".to_string(),
//             image_url: "https://example.com/shield.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 5,
//             health: 150,
//             max_health: 150,
//             degrade_per_use: 1,
//             price: 1000,
//             rarity: "rare".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "block_button".to_string(),
//             name: "Block Button".to_string(),
//             emoji: "🚫".to_string(),
//             description: "Ultimate defense. Makes you invulnerable to haters.".to_string(),
//             image_url: "https://example.com/block.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 0,
//             health: 100,
//             max_health: 100,
//             degrade_per_use: 1,
//             price: 900,
//             rarity: "uncommon".to_string(),
//         },

//         // HEALING/SUPPORT
//         WeaponCatalogItem {
//             id: "wholesome_wand".to_string(),
//             name: "Wholesome Wand".to_string(),
//             emoji: "✨".to_string(),
//             description: "Spreads positivity and heals damaged tweets. Restores faith in humanity.".to_string(),
//             image_url: "https://example.com/wand.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 40,
//             health: 80,
//             max_health: 80,
//             degrade_per_use: 1,
//             price: 1100,
//             rarity: "rare".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "copium_canister".to_string(),
//             name: "Copium Canister".to_string(),
//             emoji: "💊".to_string(),
//             description: "Emergency healing item. Helps you cope with bad engagement metrics.".to_string(),
//             image_url: "https://example.com/copium.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 30,
//             health: 50,
//             max_health: 50,
//             degrade_per_use: 1,
//             price: 500,
//             rarity: "common".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "hopium_injector".to_string(),
//             name: "Hopium Injector".to_string(),
//             emoji: "💉".to_string(),
//             description: "Restores optimism. Temporarily boosts tweet performance.".to_string(),
//             image_url: "https://example.com/hopium.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 25,
//             health: 60,
//             max_health: 60,
//             degrade_per_use: 1,
//             price: 600,
//             rarity: "common".to_string(),
//         },

//         // GADGETS/UTILITY
//         WeaponCatalogItem {
//             id: "viral_amplifier".to_string(),
//             name: "Viral Amplifier".to_string(),
//             emoji: "📢".to_string(),
//             description: "Boosts tweet reach. Increases retweet probability by 50%.".to_string(),
//             image_url: "https://example.com/amplifier.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 10,
//             health: 40,
//             max_health: 40,
//             degrade_per_use: 1,
//             price: 2500,
//             rarity: "legendary".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "algorithm_manipulator".to_string(),
//             name: "Algorithm Manipulator".to_string(),
//             emoji: "🎰".to_string(),
//             description: "Hacks the timeline algorithm. Your tweets appear first.".to_string(),
//             image_url: "https://example.com/algorithm.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 0,
//             health: 30,
//             max_health: 30,
//             degrade_per_use: 1,
//             price: 3000,
//             rarity: "legendary".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "engagement_bait".to_string(),
//             name: "Engagement Bait".to_string(),
//             emoji: "🎣".to_string(),
//             description: "Generates controversial takes that guarantee replies.".to_string(),
//             image_url: "https://example.com/bait.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 5,
//             health: 50,
//             max_health: 50,
//             degrade_per_use: 1,
//             price: 700,
//             rarity: "uncommon".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "mute_button".to_string(),
//             name: "Mute Button".to_string(),
//             emoji: "🔇".to_string(),
//             description: "Silences annoying discourse. Peaceful timeline guaranteed.".to_string(),
//             image_url: "https://example.com/mute.png".to_string(),
//             tool_type: ToolType::Support,
//             tool_target: ToolTarget::Tweet,
//             impact: 15,
//             health: 70,
//             max_health: 70,
//             degrade_per_use: 1,
//             price: 400,
//             rarity: "common".to_string(),
//         },
//         WeaponCatalogItem {
//             id: "quote_tweet_sniper".to_string(),
//             name: "Quote Tweet Sniper".to_string(),
//             emoji: "🎯".to_string(),
//             description: "Perfect for dunking from a distance. High precision, maximum ratio.".to_string(),
//             image_url: "https://example.com/sniper.png".to_string(),
//             tool_type: ToolType::Weapon,
//             tool_target: ToolTarget::Tweet,
//             impact: 28,
//             health: 65,
//             max_health: 65,
//             degrade_per_use: 1,
//             price: 1400,
//             rarity: "rare".to_string(),
//         },
//     ]
// }

// pub fn get_weapon_by_id(id: &str) -> Option<WeaponCatalogItem> {
//     get_weapon_catalog().into_iter().find(|w| w.id == id)
// }
