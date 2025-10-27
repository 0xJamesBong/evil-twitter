use crate::models::assets::enums::TokenType;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenLedgerEntry {
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub token: TokenType,
    pub delta: i64,
    pub reason: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}
