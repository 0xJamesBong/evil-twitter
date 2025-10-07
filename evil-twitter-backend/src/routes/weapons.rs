use crate::models::{tool::Weapon, user::User, weapon_catalog};
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
pub struct CreateWeaponRequest {
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

/// Create a weapon from the catalog
#[utoipa::path(
    post,
    path = "/weapons/{user_id}/create",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    request_body = CreateWeaponRequest,
    responses(
        (status = 201, description = "Weapon created successfully", body = Weapon),
        (status = 400, description = "Invalid catalog ID or user ID"),
        (status = 404, description = "Weapon not found in catalog")
    ),
    tag = "weapons"
)]
pub async fn create_weapon(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<CreateWeaponRequest>,
) -> Result<(StatusCode, Json<Weapon>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Weapon> = db.collection("weapons");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");

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

    // Create weapon instance from catalog
    let weapon = Weapon {
        id: Some(ObjectId::new()),
        owner_id: user_id.clone(),
        name: catalog_item.name,
        description: catalog_item.description,
        image_url: catalog_item.emoji,
        damage: catalog_item.attack_power,
        health: catalog_item.max_health,
        max_health: catalog_item.max_health,
        degrade_per_use: 1,
    };

    give_user_weapon(&user_collection, &collection, &user_oid, weapon.clone()).await
}

pub async fn give_user_weapon(
    users: &Collection<User>,
    weapons: &Collection<Weapon>,
    user_id: &ObjectId,
    weapon: Weapon,
) -> Result<(StatusCode, Json<Weapon>), (StatusCode, Json<serde_json::Value>)> {
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
        (status = 200, description = "User weapons retrieved successfully", body = Vec<Weapon>),
        (status = 400, description = "Invalid user ID"),
        (status = 404, description = "User not found")
    ),
    tag = "weapons"
)]
pub async fn get_user_weapons(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<Weapon>>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Weapon> = db.collection("weapons");

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

    let weapons: Vec<Weapon> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to collect weapons"})),
        )
    })?;

    Ok(Json(weapons))
}
