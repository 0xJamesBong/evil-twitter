use crate::{
    models::{
        asset::{Asset, AssetType},
        token::TokenBalance,
        tool::{Tool, ToolBuilder, ToolTarget, ToolType},
        user::User,
        weapon_catalog,
    },
    routes::economy::{AdjustBalanceRequest, apply_balance_change, maybe_bootstrap_balances},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use futures::TryStreamExt;
use mongodb::{
    bson::{DateTime, doc, oid::ObjectId},
    Collection, Database,
};
use utoipa::ToSchema;

use serde::Deserialize;
use serde_json::json;

#[derive(Debug, Deserialize, ToSchema)]
pub struct BuyWeaponRequest {
    #[schema(example = "sword_of_truth")]
    pub catalog_id: String,
}

/// Get the weapon catalog
#[utoipa::path(
    get,
    path = "/weapons/catalog",
    responses(
        (status = 200, description = "Weapon catalog retrieved successfully", body = Vec<weapon_catalog::WeaponCatalogItem>)
    ),
    tag = "weapons"
)]
pub async fn get_weapon_catalog_endpoint() -> Json<Vec<weapon_catalog::WeaponCatalogItem>> {
    Json(weapon_catalog::get_weapon_catalog())
}

/// Buy a weapon from the catalog
#[utoipa::path(
    post,
    path = "/weapons/{user_id}/buy",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    request_body = BuyWeaponRequest,
    responses(
        (status = 201, description = "Weapon purchased successfully", body = Tool),
        (status = 400, description = "Invalid catalog ID or user ID"),
        (status = 404, description = "Weapon not found in catalog")
    ),
    tag = "weapons"
)]
pub async fn buy_weapon(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<BuyWeaponRequest>,
) -> Result<(StatusCode, Json<Tool>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tool> = db.collection("weapons");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");
    let assets_collection: Collection<Asset> = db.collection("assets");
    let balances_collection: Collection<TokenBalance> = db.collection("token_balances");

    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // Get the weapon from catalog
    let catalog_item = weapon_catalog::get_weapon_by_id(&payload.catalog_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Weapon not found in catalog"})),
        )
    })?;

    maybe_bootstrap_balances(&balances_collection, &user_id)
        .await
        .map_err(|err| err)?;

    if catalog_item.price > 0 {
        apply_balance_change(
            &db,
            &user_id,
            &AdjustBalanceRequest {
                token_symbol: "USDC".to_string(),
                available_delta: -(catalog_item.price as i64),
                locked_delta: Some(0),
                reference_type: Some("weapon_purchase".to_string()),
                reference_id: Some(payload.catalog_id.clone()),
                notes: Some(format!("Bought {}", catalog_item.name)),
            },
        )
        .await?;
    }

    // Create weapon instance from catalog
    let weapon_name = catalog_item.name.clone();
    let weapon_description = catalog_item.description.clone();
    let weapon_emoji = catalog_item.emoji.clone();
    let weapon_image_url = catalog_item.image_url.clone();
    let weapon = ToolBuilder::new(user_id.clone())
        .name(weapon_name.clone())
        .description(weapon_description.clone())
        .image_url(weapon_image_url.clone())
        .impact(catalog_item.impact)
        .degrade_per_use(catalog_item.degrade_per_use)
        .tool_type(ToolType::Weapon)
        .tool_target(ToolTarget::Tweet)
        .build();

    let (status, Json(weapon)) =
        give_user_weapon(&user_collection, &collection, &user_oid, weapon.clone()).await?;

    let mut asset = Asset::new(user_id.clone(), AssetType::Tool, weapon_name);
    asset.description = Some(weapon_description);
    asset.media_url = Some(weapon_image_url);
    asset.attributes = Some(json!({
        "emoji": weapon_emoji,
        "impact": catalog_item.impact,
        "health": catalog_item.health,
        "max_health": catalog_item.max_health,
        "degrade_per_use": catalog_item.degrade_per_use,
        "weapon_id": weapon.id.as_ref().map(|id| id.to_hex())
    }));
    asset.tradeable = true;
    asset.created_at = DateTime::now();
    asset.updated_at = asset.created_at;

    let _ = assets_collection.insert_one(&asset).await;

    Ok((status, Json(weapon)))
}

pub async fn give_user_weapon(
    users: &Collection<User>,
    weapons: &Collection<Tool>,
    user_id: &ObjectId,
    weapon: Tool,
) -> Result<(StatusCode, Json<Tool>), (StatusCode, Json<serde_json::Value>)> {
    // insert weapon into the weapon collection
    let mut weapon = weapon;
    weapon.owner_id = user_id.to_hex(); // or user.supabase_id
    let insert_result = weapons.insert_one(&weapon).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create weapon"})),
        )
    })?;

    // add weapon id to user's list
    if let Some(inserted_id) = insert_result.inserted_id.as_object_id() {
        weapon.id = Some(inserted_id);
        users
            .update_one(
                doc! { "_id": user_id },
                doc! { "$push": { "weapon_ids": inserted_id } },
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Failed to update user weapon list"})),
                )
            })?;
    }

    Ok((StatusCode::CREATED, Json(weapon)))
}

/// Get all weapons for a user
#[utoipa::path(
    get,
    path = "/users/{user_id}/weapons",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User weapons retrieved successfully", body = Vec<Tool>),
        (status = 400, description = "Invalid user ID"),
        (status = 404, description = "User not found")
    ),
    tag = "weapons"
)]
pub async fn get_user_weapons(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Tool>>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tool> = db.collection("weapons");

    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // Find all weapons owned by this user
    let cursor = collection
        .find(doc! { "owner_id": user_oid.to_hex() })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to fetch weapons"})),
            )
        })?;

    let weapons: Vec<Tool> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to collect weapons"})),
        )
    })?;

    Ok(Json(weapons))
}
