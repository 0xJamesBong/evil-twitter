use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;

/// Tip record stored in MongoDB to track tips by post
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TipRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    /// Recipient wallet (base58 string)
    pub recipient_wallet: String,

    /// Sender wallet (base58 string)
    pub sender_wallet: String,

    /// Post ID (MongoDB ObjectId as string) - None for direct user tips
    pub post_id: Option<String>,

    /// Token mint (base58 string)
    pub token_mint: String,

    /// Amount in lamports
    pub amount: u64,

    /// Whether this tip has been claimed
    #[serde(default)]
    pub claimed: bool,

    /// Transaction signature when tip was sent on-chain
    pub signature: Option<String>,

    /// When the tip was created
    pub created_at: DateTime,

    /// When the tip was claimed (if claimed)
    pub claimed_at: Option<DateTime>,
}

impl TipRecord {
    pub const COLLECTION_NAME: &str = "tip_records";

    pub fn new(
        recipient_wallet: Pubkey,
        sender_wallet: Pubkey,
        post_id: Option<String>,
        token_mint: Pubkey,
        amount: u64,
        signature: Option<String>,
    ) -> Self {
        Self {
            id: None,
            recipient_wallet: recipient_wallet.to_string(),
            sender_wallet: sender_wallet.to_string(),
            post_id,
            token_mint: token_mint.to_string(),
            amount,
            claimed: false,
            signature,
            created_at: DateTime::now(),
            claimed_at: None,
        }
    }
}

