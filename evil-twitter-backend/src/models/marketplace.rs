use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ListingStatus {
    Active,
    Escrow,
    Filled,
    Cancelled,
    Expired,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct AssetListing {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub asset_id: ObjectId,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub seller_id: String,

    #[schema(example = "EVL")]
    pub price_token: String,

    #[schema(example = "25000")]
    pub price_amount: i64,

    #[serde(default = "default_fee_bps")]
    #[schema(example = "250")]
    pub fee_bps: i32,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub updated_at: DateTime,

    pub status: ListingStatus,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub buyer_id: Option<String>,

    #[schema(value_type = String, example = "2024-01-02T00:00:00Z")]
    pub filled_at: Option<DateTime>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TradeReceipt {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub listing_id: ObjectId,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub asset_id: ObjectId,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub seller_id: String,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub buyer_id: String,

    #[schema(example = "EVL")]
    pub price_token: String,

    #[schema(example = "25000")]
    pub price_amount: i64,

    #[schema(example = "250")]
    pub fee_bps: i32,

    #[schema(example = "625")]
    pub fee_amount: i64,

    #[schema(example = "24375")]
    pub seller_payout: i64,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub executed_at: DateTime,
}

const fn default_fee_bps() -> i32 {
    250
}
