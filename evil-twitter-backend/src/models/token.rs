use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TokenBalance {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub user_id: String,

    #[schema(example = "EVL")]
    pub token_symbol: String,

    #[schema(example = "100000")]
    pub available: i64,

    #[serde(default)]
    #[schema(example = "0")]
    pub locked: i64,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub updated_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum LedgerEntryType {
    Deposit,
    Withdrawal,
    Purchase,
    Sale,
    TradeFee,
    TradePayout,
    Adjustment,
    Reservation,
    Release,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TokenLedgerEntry {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub user_id: String,

    #[schema(example = "EVL")]
    pub token_symbol: String,

    #[schema(example = "1000")]
    pub amount: i64,

    pub entry_type: LedgerEntryType,

    #[schema(example = "shop_purchase")]
    pub reference_type: Option<String>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub reference_id: Option<String>,

    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    #[serde(default = "DateTime::now")]
    pub created_at: DateTime,

    #[schema(example = "Bought a flaming sword")]
    pub notes: Option<String>,
}
