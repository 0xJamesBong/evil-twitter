use crate::models::assets::enums::Item;

use super::enums::AssetType;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

/// This is for listing on the marketplace

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: ObjectId,
    pub owner_id: ObjectId,
    pub asset_type: AssetType,
    pub tradeable: bool,
    pub item: Option<Item>,
}
