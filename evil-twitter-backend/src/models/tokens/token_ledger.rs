use crate::models::tokens::enums::TokenType;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenLedgerEntry {
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub token: TokenType,
    pub delta: i64,     // +100 (add), -50 (subtract)
    pub reason: String, // "Purchased 100 DOOLER", "Bought
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
