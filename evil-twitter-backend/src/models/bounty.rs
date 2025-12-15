use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "PascalCase")]
pub enum BountyStatus {
    Open,
    Awarded,
    ClosedNoAward,
    ExpiredUnresolved,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Bounty {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub question_tweet_id: ObjectId,

    #[serde(default)]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439012")]
    pub answer_tweet_id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439013")]
    pub sponsor_user_id: ObjectId,

    #[schema(example = "So11111111111111111111111111111111111111112")]
    pub token_mint: String,

    #[schema(example = "1000000")]
    pub amount: u64,

    #[schema(example = "2024-12-31T23:59:59Z")]
    pub expires_at: DateTime,

    #[schema(example = "Open")]
    pub status: BountyStatus,

    #[schema(example = "false")]
    pub claimed: bool,

    #[schema(example = "BountyAccountPubkey123...")]
    pub onchain_bounty_pubkey: String,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(default)]
    #[schema(value_type = String, example = "2024-01-15T00:00:00Z")]
    pub awarded_at: Option<DateTime>,

    #[serde(default)]
    #[schema(value_type = String, example = "2024-01-20T00:00:00Z")]
    pub claimed_at: Option<DateTime>,

    #[serde(default)]
    #[schema(value_type = String, example = "2024-01-25T00:00:00Z")]
    pub reclaimed_at: Option<DateTime>,
}

