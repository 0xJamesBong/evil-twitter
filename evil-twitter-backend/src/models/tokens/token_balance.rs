use crate::models::tokens::enums::TokenType;
use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Per-user balances for each token.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TokenBalance {
    /// Mongo primary key
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    /// Owner of this balance row
    pub owner: AccountOwner,
    /// Which token this balance is for
    pub token: TokenType,

    /// Spendable balance (smallest units)
    #[schema(example = "1000000")]
    pub amount: i64,

    /// Optional: locked for escrow / staking / pending payouts
    #[serde(default)]
    #[schema(example = "0")]
    pub locked: i64,

    pub created_at: DateTime,
    pub updated_at: DateTime,
}

impl TokenBalance {
    pub fn new(owner: AccountOwner, token: TokenType) -> Self {
        let now = DateTime::now();
        Self {
            id: None,
            owner,
            token,
            amount: 0,
            locked: 0,
            created_at: now,
            updated_at: now,
        }
    }
}
