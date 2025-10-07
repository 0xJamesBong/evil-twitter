use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct WeaponCatalogItem {
    #[schema(example = "sword_of_truth")]
    pub id: String,
    
    #[schema(example = "Sword of Truth")]
    pub name: String,
    
    #[schema(example = "⚔️")]
    pub emoji: String,
    
    #[schema(example = "A legendary blade that cuts through lies and misinformation")]
    pub description: String,
    
    #[schema(example = "weapon")]
    pub category: String,
    
    #[schema(example = 100)]
    pub max_health: i32,
    
    #[schema(example = 25)]
    pub attack_power: i32,
    
    #[schema(example = 15)]
    pub heal_power: i32,
    
    #[schema(example = 1000)]
    pub price: i32,
    
    #[schema(example = "rare")]
    pub rarity: String,
}

// Predefined weapon catalog
pub fn get_weapon_catalog() -> Vec<WeaponCatalogItem> {
    vec![
        // WEAPONS
        WeaponCatalogItem {
            id: "sword_of_truth".to_string(),
            name: "Sword of Truth".to_string(),
            emoji: "⚔️".to_string(),
            description: "A legendary blade that cuts through lies and misinformation. Deals devastating damage to false narratives.".to_string(),
            category: "weapon".to_string(),
            max_health: 100,
            attack_power: 30,
            heal_power: 0,
            price: 1500,
            rarity: "legendary".to_string(),
        },
        WeaponCatalogItem {
            id: "ban_hammer".to_string(),
            name: "Ban Hammer".to_string(),
            emoji: "🔨".to_string(),
            description: "The ultimate moderation tool. One swing can silence the loudest trolls.".to_string(),
            category: "weapon".to_string(),
            max_health: 80,
            attack_power: 40,
            heal_power: 0,
            price: 2000,
            rarity: "legendary".to_string(),
        },
        WeaponCatalogItem {
            id: "ratio_rifle".to_string(),
            name: "Ratio Rifle".to_string(),
            emoji: "🔫".to_string(),
            description: "Precision weapon that exposes bad takes with surgical accuracy.".to_string(),
            category: "weapon".to_string(),
            max_health: 60,
            attack_power: 25,
            heal_power: 0,
            price: 1200,
            rarity: "rare".to_string(),
        },
        WeaponCatalogItem {
            id: "sarcasm_saber".to_string(),
            name: "Sarcasm Saber".to_string(),
            emoji: "🗡️".to_string(),
            description: "Cuts deep with witty remarks. Effective against serious takes.".to_string(),
            category: "weapon".to_string(),
            max_health: 70,
            attack_power: 20,
            heal_power: 0,
            price: 800,
            rarity: "uncommon".to_string(),
        },
        WeaponCatalogItem {
            id: "cancel_cannon".to_string(),
            name: "Cancel Cannon".to_string(),
            emoji: "💥".to_string(),
            description: "Fires explosive callouts. Use with caution.".to_string(),
            category: "weapon".to_string(),
            max_health: 50,
            attack_power: 35,
            heal_power: 0,
            price: 1800,
            rarity: "rare".to_string(),
        },
        
        // SHIELDS/DEFENSE
        WeaponCatalogItem {
            id: "echo_chamber_shield".to_string(),
            name: "Echo Chamber Shield".to_string(),
            emoji: "🛡️".to_string(),
            description: "Reflects criticism back to sender. Creates a safe space bubble.".to_string(),
            category: "defense".to_string(),
            max_health: 150,
            attack_power: 5,
            heal_power: 0,
            price: 1000,
            rarity: "rare".to_string(),
        },
        WeaponCatalogItem {
            id: "block_button".to_string(),
            name: "Block Button".to_string(),
            emoji: "🚫".to_string(),
            description: "Ultimate defense. Makes you invulnerable to haters.".to_string(),
            category: "defense".to_string(),
            max_health: 100,
            attack_power: 0,
            heal_power: 10,
            price: 900,
            rarity: "uncommon".to_string(),
        },
        
        // HEALING/SUPPORT
        WeaponCatalogItem {
            id: "wholesome_wand".to_string(),
            name: "Wholesome Wand".to_string(),
            emoji: "✨".to_string(),
            description: "Spreads positivity and heals damaged tweets. Restores faith in humanity.".to_string(),
            category: "support".to_string(),
            max_health: 80,
            attack_power: 0,
            heal_power: 40,
            price: 1100,
            rarity: "rare".to_string(),
        },
        WeaponCatalogItem {
            id: "copium_canister".to_string(),
            name: "Copium Canister".to_string(),
            emoji: "💊".to_string(),
            description: "Emergency healing item. Helps you cope with bad engagement metrics.".to_string(),
            category: "support".to_string(),
            max_health: 50,
            attack_power: 0,
            heal_power: 30,
            price: 500,
            rarity: "common".to_string(),
        },
        WeaponCatalogItem {
            id: "hopium_injector".to_string(),
            name: "Hopium Injector".to_string(),
            emoji: "💉".to_string(),
            description: "Restores optimism. Temporarily boosts tweet performance.".to_string(),
            category: "support".to_string(),
            max_health: 60,
            attack_power: 0,
            heal_power: 25,
            price: 600,
            rarity: "common".to_string(),
        },
        
        // GADGETS/UTILITY
        WeaponCatalogItem {
            id: "viral_amplifier".to_string(),
            name: "Viral Amplifier".to_string(),
            emoji: "📢".to_string(),
            description: "Boosts tweet reach. Increases retweet probability by 50%.".to_string(),
            category: "utility".to_string(),
            max_health: 40,
            attack_power: 10,
            heal_power: 0,
            price: 2500,
            rarity: "legendary".to_string(),
        },
        WeaponCatalogItem {
            id: "algorithm_manipulator".to_string(),
            name: "Algorithm Manipulator".to_string(),
            emoji: "🎰".to_string(),
            description: "Hacks the timeline algorithm. Your tweets appear first.".to_string(),
            category: "utility".to_string(),
            max_health: 30,
            attack_power: 0,
            heal_power: 0,
            price: 3000,
            rarity: "legendary".to_string(),
        },
        WeaponCatalogItem {
            id: "engagement_bait".to_string(),
            name: "Engagement Bait".to_string(),
            emoji: "🎣".to_string(),
            description: "Generates controversial takes that guarantee replies.".to_string(),
            category: "utility".to_string(),
            max_health: 50,
            attack_power: 5,
            heal_power: 0,
            price: 700,
            rarity: "uncommon".to_string(),
        },
        WeaponCatalogItem {
            id: "mute_button".to_string(),
            name: "Mute Button".to_string(),
            emoji: "🔇".to_string(),
            description: "Silences annoying discourse. Peaceful timeline guaranteed.".to_string(),
            category: "utility".to_string(),
            max_health: 70,
            attack_power: 0,
            heal_power: 15,
            price: 400,
            rarity: "common".to_string(),
        },
        WeaponCatalogItem {
            id: "quote_tweet_sniper".to_string(),
            name: "Quote Tweet Sniper".to_string(),
            emoji: "🎯".to_string(),
            description: "Perfect for dunking from a distance. High precision, maximum ratio.".to_string(),
            category: "weapon".to_string(),
            max_health: 65,
            attack_power: 28,
            heal_power: 0,
            price: 1400,
            rarity: "rare".to_string(),
        },
    ]
}

pub fn get_weapon_by_id(id: &str) -> Option<WeaponCatalogItem> {
    get_weapon_catalog().into_iter().find(|w| w.id == id)
}

