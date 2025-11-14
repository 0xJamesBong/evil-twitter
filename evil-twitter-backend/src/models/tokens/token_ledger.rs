use crate::models::tokens::enums::TokenType;
use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Append-only transaction log for token movements.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TokenLedgerEntry {
    /// Mongo primary key
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439021")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439012")]
    pub user_id: ObjectId,

    pub token: TokenType,

    /// +amount (credit), -amount (debit)
    #[schema(example = "100")]
    pub delta: i64,

    /// Human-readable description ("PUMP on tweet X", "SMACK reward", etc.)
    #[schema(example = "PUMP on tweet 507f1f77bcf86cd799439099")]
    pub reason: String,

    /// When this transaction happened
    #[schema(example = "2024-01-02T12:34:56Z")]
    pub timestamp: DateTime,
}

impl TokenLedgerEntry {
    pub fn new(user_id: ObjectId, token: TokenType, delta: i64, reason: impl Into<String>) -> Self {
        Self {
            id: None,
            user_id,
            token,
            delta,
            reason: reason.into(),
            timestamp: DateTime::now(),
        }
    }
}
