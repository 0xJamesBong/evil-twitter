use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Post state cached from on-chain data for fast reads
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct PostState {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    /// Post ID hash (32 bytes as hex string)
    #[schema(example = "a1b2c3d4e5f6...")]
    pub post_id_hash: String,

    /// Post PDA address (base58)
    #[schema(example = "7xKXtg2CZ3QZ4Z3J3J3J3J3J3J3J3J3J3J3J3J3")]
    pub post_pda: String,

    /// Post state: "Open" or "Settled"
    #[schema(example = "Open")]
    pub state: String,

    /// Number of upvotes (Pump votes)
    #[schema(example = "100")]
    pub upvotes: u64,

    /// Number of downvotes (Smack votes)
    #[schema(example = "50")]
    pub downvotes: u64,

    /// Winning side: "Pump" or "Smack" (None if not settled or tie)
    #[serde(default)]
    #[schema(example = "Pump")]
    pub winning_side: Option<String>,

    /// Start time (Unix timestamp)
    #[schema(example = "1704067200")]
    pub start_time: i64,

    /// End time (Unix timestamp)
    #[schema(example = "1704153600")]
    pub end_time: i64,

    /// Post function: "Normal", "Question", or "Answer"
    #[serde(default)]
    #[schema(example = "Normal")]
    pub function: Option<String>,

    /// Last time this state was synced from chain
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub last_synced_at: DateTime,
}

impl PostState {
    pub const COLLECTION_NAME: &str = "post_states";
}
