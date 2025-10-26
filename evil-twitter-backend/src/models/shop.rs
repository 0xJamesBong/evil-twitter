use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct ShopItem {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(example = "Infernal Booster Pack")]
    pub name: String,

    #[schema(example = "Contains randomly generated evil tools")]
    pub description: Option<String>,

    #[schema(example = "https://cdn.evil-twitter.com/shop/booster-pack.png")]
    pub media_url: Option<String>,

    #[schema(example = "tool")]
    pub asset_blueprint: String,

    #[schema(value_type = Object)]
    pub asset_attributes: Option<serde_json::Value>,

    #[schema(example = "EVL")]
    pub price_token: String,

    #[schema(example = "25000")]
    pub price_amount: i64,

    /// Optional finite supply - None means infinite
    #[schema(example = "100")]
    pub total_supply: Option<i64>,

    #[schema(example = "90")]
    pub remaining_supply: Option<i64>,

    #[serde(default)]
    #[schema(example = "true")]
    pub is_active: bool,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub updated_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct ShopPurchaseReceipt {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub user_id: String,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub asset_id: ObjectId,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub shop_item_id: ObjectId,

    #[schema(example = "EVL")]
    pub price_token: String,

    #[schema(example = "25000")]
    pub price_amount: i64,

    #[serde(default = "DateTime::now")]
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub purchased_at: DateTime,
}
