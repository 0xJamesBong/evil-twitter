use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection, Database,
};

use crate::models::follow::{CreateFollow, Follow};

/// Follow a user
#[utoipa::path(
    post,
    path = "/follows",
    request_body = CreateFollow,
    responses(
        (status = 201, description = "User followed successfully", body = Follow),
        (status = 400, description = "Invalid input data"),
        (status = 409, description = "Already following this user")
    ),
    tag = "follows"
)]
pub async fn follow_user(
    State(db): State<Database>,
    Json(payload): Json<CreateFollow>,
) -> Result<(StatusCode, Json<Follow>), (StatusCode, Json<serde_json::Value>)> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    let user_collection: Collection<crate::models::user::User> = db.collection("users");
    
    let following_id = ObjectId::parse_str(&payload.following_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // TODO: Get current user ID from auth
    let follower_id = ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap();

    // Check if already following
    let existing_follow = follow_collection
        .find_one(doc! {
            "follower_id": follower_id,
            "following_id": following_id
        })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    if existing_follow.is_some() {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({"error": "Already following this user"})),
        ));
    }

    // Check if target user exists
    let target_user = user_collection
        .find_one(doc! {"_id": following_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    if target_user.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "User not found"})),
        ));
    }

    let now = mongodb::bson::DateTime::now();
    let follow = Follow {
        id: None,
        follower_id,
        following_id,
        created_at: now,
    };

    let result = follow_collection.insert_one(&follow).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create follow"})),
        )
    })?;

    let mut created_follow = follow;
    created_follow.id = Some(result.inserted_id.as_object_id().unwrap());

    Ok((StatusCode::CREATED, Json(created_follow)))
}

/// Unfollow a user
#[utoipa::path(
    delete,
    path = "/follows/{following_id}",
    params(
        ("following_id" = String, Path, description = "User ID to unfollow")
    ),
    responses(
        (status = 200, description = "User unfollowed successfully"),
        (status = 404, description = "Follow relationship not found")
    ),
    tag = "follows"
)]
pub async fn unfollow_user(
    State(db): State<Database>,
    Path(following_id): Path<String>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    
    let following_object_id = ObjectId::parse_str(&following_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    // TODO: Get current user ID from auth
    let follower_id = ObjectId::parse_str("507f1f77bcf86cd799439011").unwrap();

    let result = follow_collection
        .delete_one(doc! {
            "follower_id": follower_id,
            "following_id": following_object_id
        })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    if result.deleted_count == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Follow relationship not found"})),
        ));
    }

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({"message": "User unfollowed successfully"})),
    ))
}