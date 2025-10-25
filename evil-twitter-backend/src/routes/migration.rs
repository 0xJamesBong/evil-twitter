use axum::{Json, extract::State, http::StatusCode};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};
use serde::Serialize;

use crate::models::user::User;

#[derive(Serialize, utoipa::ToSchema)]
pub struct MigrationResponse {
    pub message: String,
    pub modified_count: u64,
    pub matched_count: u64,
}

/// Migration endpoint to add weapon_ids field to existing users
#[utoipa::path(
    post,
    path = "/admin/migrate-users-weapons",
    responses(
        (status = 200, description = "Migration completed successfully", body = MigrationResponse),
        (status = 500, description = "Database error during migration")
    ),
    tag = "admin"
)]
pub async fn migrate_users_weapons(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<MigrationResponse>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<User> = db.collection("users");

    // Update all users that don't have a weapon_ids field to have weapon_ids: []
    let result = collection
        .update_many(
            doc! { "weapon_ids": { "$exists": false } },
            doc! { "$set": { "weapon_ids": [] } },
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error during migration"})),
            )
        })?;

    Ok((
        StatusCode::OK,
        Json(MigrationResponse {
            message: "User weapon_ids migration completed successfully".to_string(),
            modified_count: result.modified_count,
            matched_count: result.matched_count,
        }),
    ))
}

/// Migration endpoint to fix duplicate user ObjectIds
#[utoipa::path(
    post,
    path = "/admin/migrate-user-objectids",
    responses(
        (status = 200, description = "Migration completed successfully", body = MigrationResponse),
        (status = 500, description = "Database error during migration")
    ),
    tag = "admin"
)]
pub async fn migrate_user_objectids(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<MigrationResponse>), (StatusCode, Json<serde_json::Value>)> {
    let users_collection = db.collection::<mongodb::bson::Document>("users");
    let tweets_collection = db.collection::<mongodb::bson::Document>("tweets");
    let follows_collection = db.collection::<mongodb::bson::Document>("follows");

    // The problematic ObjectId that all users share
    let problematic_id = match ObjectId::parse_str("68d9b685550f1355d0f01ba4") {
        Ok(id) => id,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid ObjectId format"})),
            ));
        }
    };

    // Find all users with the problematic ObjectId
    let cursor = users_collection
        .find(doc! {"_id": problematic_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error during user lookup"})),
            )
        })?;

    let users: Vec<mongodb::bson::Document> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error during user collection"})),
        )
    })?;

    if users.is_empty() {
        return Ok((
            StatusCode::OK,
            Json(MigrationResponse {
                message: "No users found with duplicate ObjectId. Migration not needed."
                    .to_string(),
                modified_count: 0,
                matched_count: 0,
            }),
        ));
    }

    let mut total_modified = 0u64;
    let mut user_updates = Vec::new();

    // Process each user
    for user_doc in &users {
        let supabase_id = match user_doc.get_str("supabase_id") {
            Ok(id) => id,
            Err(_) => continue,
        };
        let username = match user_doc.get_str("username") {
            Ok(name) => name,
            Err(_) => "unknown",
        };

        // Generate a new unique ObjectId
        let new_id = ObjectId::new();
        user_updates.push((
            problematic_id,
            new_id,
            supabase_id.to_string(),
            username.to_string(),
        ));
    }

    // Update each user with their new ObjectId
    for (old_id, new_id, _supabase_id, _username) in &user_updates {
        // Get the user document
        let user_doc = users_collection
            .find_one(doc! {"_id": old_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error during user retrieval"})),
                )
            })?
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(serde_json::json!({"error": "User not found"})),
                )
            })?;

        // Create new document with new ObjectId
        let mut new_user_doc = user_doc;
        new_user_doc.insert("_id", new_id);

        // Insert new document
        users_collection
            .insert_one(&new_user_doc)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error during user insertion"})),
                )
            })?;

        // Delete old document
        users_collection
            .delete_one(doc! {"_id": old_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error during user deletion"})),
                )
            })?;

        total_modified += 1;
    }

    // Update references in tweets collection
    for (old_id, new_id, _, _) in &user_updates {
        // Update author_id in tweets
        let _ = tweets_collection
            .update_many(
                doc! {"author_id": old_id},
                doc! {"$set": {"author_id": new_id}},
            )
            .await;

        // Update author_snapshot.user_id in tweets
        let _ = tweets_collection
            .update_many(
                doc! {"author_snapshot.user_id": old_id},
                doc! {"$set": {"author_snapshot.user_id": new_id}},
            )
            .await;

        // Update likes array in tweets
        let _ = tweets_collection
            .update_many(doc! {"likes": old_id}, doc! {"$set": {"likes.$": new_id}})
            .await;

        // Update retweets array in tweets
        let _ = tweets_collection
            .update_many(
                doc! {"retweets": old_id},
                doc! {"$set": {"retweets.$": new_id}},
            )
            .await;

        // Update quotes array in tweets
        let _ = tweets_collection
            .update_many(doc! {"quotes": old_id}, doc! {"$set": {"quotes.$": new_id}})
            .await;
    }

    // Update references in follows collection
    for (old_id, new_id, _, _) in &user_updates {
        // Update follower_id in follows
        let _ = follows_collection
            .update_many(
                doc! {"follower_id": old_id},
                doc! {"$set": {"follower_id": new_id}},
            )
            .await;

        // Update following_id in follows
        let _ = follows_collection
            .update_many(
                doc! {"following_id": old_id},
                doc! {"$set": {"following_id": new_id}},
            )
            .await;
    }

    Ok((
        StatusCode::OK,
        Json(MigrationResponse {
            message: format!(
                "User ObjectId migration completed successfully. Updated {} users.",
                user_updates.len()
            ),
            modified_count: total_modified,
            matched_count: users.len() as u64,
        }),
    ))
}
