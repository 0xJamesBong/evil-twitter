use crate::models::{
    assets::catalogItem::{CatalogItem, get_catalog, get_catalog_item_by_id},
    tool::{Tool, ToolBuilder, ToolTarget, ToolType},
    user::User,
    weapon_catalog,
};
use mongodb::{
    Collection,
    bson::{doc, oid::ObjectId},
};

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use futures::TryStreamExt;
use mongodb::Database;
use utoipa::ToSchema;

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, ToSchema)]
pub struct BuyItemRequest {
    #[schema(example = "sword_of_truth")]
    pub catalog_id: String,
}

/// Get the weapon catalog
#[utoipa::path(
    get,
    path = "/shop/catalog",
    responses(
        (status = 200, description = "Catalog retrieved successfully", body = Vec<weapon_catalog::WeaponCatalogItem>)
    ),
    tag = "items"
)]
pub async fn get_weapon_catalog_endpoint() -> Json<Vec<CatalogItem>> {
    Json(get_catalog())
}

/// Buy a Item from the catalog
#[utoipa::path(
    post,
    path = "/shop/{user_id}/buy",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    request_body = BuyItemRequest,
    responses(
        (status = 201, description = "Item purchased successfully", body = Item),
        (status = 400, description = "Invalid catalog ID or user ID"),
        (status = 404, description = "Item not found in catalog")
    ),
    tag = "items"
)]
pub async fn buy_item(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<BuyItemRequest>,
) -> Result<(StatusCode, Json<Tool>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tool> = db.collection("items");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // Get the weapon from catalog
    let catalog_item = get_catalog_item_by_id(&payload.catalog_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Item not found in catalog"})),
        )
    })?;

    let asset = AssetBuilder::new(user_id.clone())
        .item(catalog_item.item.unwrap())
        .build();

    give_user_asset(&user_collection, &collection, &user_oid, asset.clone()).await
}

pub async fn give_user_asset(
    users: &Collection<User>,
    assets: &Collection<Asset>,
    user_id: &ObjectId,
    asset: Asset,
) -> Result<(StatusCode, Json<Asset>), (StatusCode, Json<serde_json::Value>)> {
    // insert asset into the asset collection
    let mut asset = asset;
    asset.owner_id = user_id.to_hex(); // or user.supabase_id
    let insert_result = assets.insert_one(&asset).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create item"})),
        )
    })?;

    // add weapon id to user's list
    if let Some(inserted_id) = insert_result.inserted_id.as_object_id() {
        asset.id = Some(inserted_id);
        users
            .update_one(
                doc! { "_id": user_id },
                doc! { "$push": { "asset_ids": inserted_id } },
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Failed to update user weapon list"})),
                )
            })?;
    }

    Ok((StatusCode::CREATED, Json(asset)))
}

/// Get all weapons for a user
#[utoipa::path(
    get,
    path = "/users/{user_id}/assets",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User assets retrieved successfully", body = Vec<Asset>),
        (status = 400, description = "Invalid user ID"),
        (status = 404, description = "User not found")
    ),
    tag = "items"
)]
pub async fn get_user_assets(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Tool>>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tool> = db.collection("assets");
    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // Find all items owned by this user
    let cursor = collection
        .find(doc! { "owner_id": user_oid.to_hex() })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to fetch assets"})),
            )
        })?;

    let assets: Vec<Asset> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to collect assets"})),
        )
    })?;

    Ok(Json(assets))
}
