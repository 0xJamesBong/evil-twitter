use crate::models::assets::enums::TokenType;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

// Per-user balances for each token:
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenBalance {
    pub user_id: ObjectId,
    pub token: TokenType,
    pub amount: i64, // store in smallest units
}
