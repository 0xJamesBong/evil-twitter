use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use std::collections::{HashMap, HashSet};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};
use serde_json::{Value, json};
use utoipa::ToSchema;

use crate::models::follow::{Follow, FollowRequest, FollowResponse, FollowStats};
use crate::models::user::User;

type ApiError = (StatusCode, Json<Value>);

/// Follow a user
#[utoipa::path(
    post,
    path = "/users/{user_id}/follow",
    params(
        ("user_id" = String, Path, description = "User ID to follow")
    ),
    request_body = FollowRequest,
    responses(
        (status = 200, description = "Follow action completed", body = FollowResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn follow_user(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<FollowRequest>,
) -> Result<Json<FollowResponse>, ApiError> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    let user_collection: Collection<User> = db.collection("users");

    // Parse user IDs
    let following_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;
    let follower_id = ObjectId::parse_str(&payload.following_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid follower ID"})),
        )
    })?;

    // Check if users exist
    let following_user = user_collection
        .find_one(doc! {"_id": following_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "User to follow not found"})),
            )
        })?;

    let _follower_user = user_collection
        .find_one(doc! {"_id": follower_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Follower user not found"})),
            )
        })?;

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
                Json(json!({"error": "Database error"})),
            )
        })?;

    if existing_follow.is_some() {
        return Ok(Json(FollowResponse {
            success: true,
            message: "Already following this user".to_string(),
            is_following: true,
        }));
    }

    // Create follow relationship
    let follow = Follow {
        id: None,
        follower_id,
        following_id,
        created_at: chrono::Utc::now(),
    };

    follow_collection.insert_one(&follow).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Failed to create follow relationship"})),
        )
    })?;

    // Update follower count for the user being followed
    user_collection
        .update_one(
            doc! {"_id": following_id},
            doc! {"$inc": {"followers_count": 1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to update followers count"})),
            )
        })?;

    // Update following count for the follower
    user_collection
        .update_one(
            doc! {"_id": follower_id},
            doc! {"$inc": {"following_count": 1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to update following count"})),
            )
        })?;

    Ok(Json(FollowResponse {
        success: true,
        message: format!("Now following {}", following_user.display_name),
        is_following: true,
    }))
}

/// Unfollow a user
#[utoipa::path(
    delete,
    path = "/users/{user_id}/follow",
    params(
        ("user_id" = String, Path, description = "User ID to unfollow")
    ),
    request_body = FollowRequest,
    responses(
        (status = 200, description = "Unfollow action completed", body = FollowResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn unfollow_user(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<FollowRequest>,
) -> Result<Json<FollowResponse>, ApiError> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    let user_collection: Collection<User> = db.collection("users");

    // Parse user IDs
    let following_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;
    let follower_id = ObjectId::parse_str(&payload.following_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid follower ID"})),
        )
    })?;

    // Check if users exist
    let following_user = user_collection
        .find_one(doc! {"_id": following_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "User to unfollow not found"})),
            )
        })?;

    let _follower_user = user_collection
        .find_one(doc! {"_id": follower_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "Follower user not found"})),
            )
        })?;

    // Check if following
    let existing_follow = follow_collection
        .find_one(doc! {
            "follower_id": follower_id,
            "following_id": following_id
        })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    if existing_follow.is_none() {
        return Ok(Json(FollowResponse {
            success: true,
            message: "Not following this user".to_string(),
            is_following: false,
        }));
    }

    // Remove follow relationship
    follow_collection
        .delete_one(doc! {
            "follower_id": follower_id,
            "following_id": following_id
        })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to remove follow relationship"})),
            )
        })?;

    // Update follower count for the user being unfollowed
    user_collection
        .update_one(
            doc! {"_id": following_id},
            doc! {"$inc": {"followers_count": -1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to update followers count"})),
            )
        })?;

    // Update following count for the unfollower
    user_collection
        .update_one(
            doc! {"_id": follower_id},
            doc! {"$inc": {"following_count": -1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to update following count"})),
            )
        })?;

    Ok(Json(FollowResponse {
        success: true,
        message: format!("Unfollowed {}", following_user.display_name),
        is_following: false,
    }))
}

/// Check if user is following another user
#[utoipa::path(
    get,
    path = "/users/{user_id}/follow-status",
    params(
        ("user_id" = String, Path, description = "User ID to check follow status for"),
        ("follower_id" = String, Query, description = "Follower user ID")
    ),
    responses(
        (status = 200, description = "Follow status retrieved", body = FollowStats),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn get_follow_status(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<FollowStats>, ApiError> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    let user_collection: Collection<User> = db.collection("users");

    // Parse user IDs
    let following_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;

    let follower_id = params.get("follower_id").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Missing follower_id parameter"})),
        )
    })?;
    let follower_id = ObjectId::parse_str(follower_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid follower ID"})),
        )
    })?;

    // Get user to check follow status for
    let user = user_collection
        .find_one(doc! {"_id": following_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "User not found"})),
            )
        })?;

    // Check if follower is following this user
    let is_following = follow_collection
        .find_one(doc! {
            "follower_id": follower_id,
            "following_id": following_id
        })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .is_some();

    Ok(Json(FollowStats {
        followers_count: user.followers_count,
        following_count: user.following_count,
        is_following,
    }))
}

/// Get list of users that a user is following
#[utoipa::path(
    get,
    path = "/users/{user_id}/following",
    params(
        ("user_id" = String, Path, description = "User ID to get following list for")
    ),
    responses(
        (status = 200, description = "Following list retrieved", body = FollowingListResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn get_following_list(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<FollowingListResponse>, ApiError> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    let user_collection: Collection<User> = db.collection("users");

    // Parse user ID
    let user_object_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;

    // Check if user exists
    let _user = user_collection
        .find_one(doc! {"_id": user_object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "User not found"})),
            )
        })?;

    let viewer_id = if let Some(viewer) = params.get("viewer_id") {
        let parsed = ObjectId::parse_str(viewer).map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid viewer_id"})),
            )
        })?;

        user_collection
            .find_one(doc! {"_id": parsed})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(json!({"error": "Viewer not found"})),
                )
            })?;

        Some(parsed)
    } else {
        None
    };

    // Get following relationships
    let mut cursor = follow_collection
        .find(doc! {"follower_id": user_object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let mut following_ids = Vec::new();
    while let Some(follow) = cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database error"})),
        )
    })? {
        following_ids.push(follow.following_id);
    }

    if following_ids.is_empty() {
        return Ok(Json(FollowingListResponse { following: Vec::new() }));
    }

    let mut viewer_follow_set: HashSet<ObjectId> = HashSet::new();
    if let Some(ref viewer_id) = viewer_id {
        let mut viewer_cursor = follow_collection
            .find(doc! {
                "follower_id": viewer_id.clone(),
                "following_id": {"$in": &following_ids}
            })
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?;

        while let Some(follow) = viewer_cursor.try_next().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })? {
            viewer_follow_set.insert(follow.following_id);
        }
    }

    let mut user_cursor = user_collection
        .find(doc! {"_id": {"$in": &following_ids}})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let mut user_map: HashMap<ObjectId, User> = HashMap::new();
    while let Some(user) = user_cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database error"})),
        )
    })? {
        if let Some(id) = user.id {
            user_map.insert(id, user);
        }
    }

    let mut following_entries: Vec<FollowListEntry> = Vec::new();
    for following_id in following_ids {
        if let Some(user) = user_map.get(&following_id) {
            let is_viewer = matches!(viewer_id, Some(ref viewer) if viewer == &following_id);
            let is_followed = viewer_follow_set.contains(&following_id);

            following_entries.push(FollowListEntry {
                user: user.clone(),
                is_followed_by_viewer: is_followed,
                is_viewer,
            });
        }
    }

    Ok(Json(FollowingListResponse {
        following: following_entries,
    }))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct FollowListEntry {
    pub user: User,
    #[serde(default)]
    pub is_followed_by_viewer: bool,
    #[serde(default)]
    pub is_viewer: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct FollowingListResponse {
    pub following: Vec<FollowListEntry>,
}

/// Get list of users that follow a user
#[utoipa::path(
    get,
    path = "/users/{user_id}/followers",
    params(
        ("user_id" = String, Path, description = "User ID to get followers list for")
    ),
    responses(
        (status = 200, description = "Followers list retrieved", body = FollowersListResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn get_followers_list(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<FollowersListResponse>, ApiError> {
    let follow_collection: Collection<Follow> = db.collection("follows");
    let user_collection: Collection<User> = db.collection("users");

    // Parse user ID
    let user_object_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;

    // Check if user exists
    let _user = user_collection
        .find_one(doc! {"_id": user_object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(json!({"error": "User not found"})),
            )
        })?;

    let viewer_id = if let Some(viewer) = params.get("viewer_id") {
        let parsed = ObjectId::parse_str(viewer).map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Invalid viewer_id"})),
            )
        })?;

        user_collection
            .find_one(doc! {"_id": parsed})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(json!({"error": "Viewer not found"})),
                )
            })?;

        Some(parsed)
    } else {
        None
    };

    // Get followers relationships (where this user is being followed)
    let mut cursor = follow_collection
        .find(doc! {"following_id": user_object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let mut follower_ids = Vec::new();
    while let Some(follow) = cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database error"})),
        )
    })? {
        follower_ids.push(follow.follower_id);
    }

    if follower_ids.is_empty() {
        return Ok(Json(FollowersListResponse {
            followers: Vec::new(),
        }));
    }

    let mut viewer_follow_set: HashSet<ObjectId> = HashSet::new();
    if let Some(ref viewer_id) = viewer_id {
        let mut viewer_cursor = follow_collection
            .find(doc! {
                "follower_id": viewer_id.clone(),
                "following_id": {"$in": &follower_ids}
            })
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?;

        while let Some(follow) = viewer_cursor.try_next().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })? {
            viewer_follow_set.insert(follow.following_id);
        }
    }

    let mut user_cursor = user_collection
        .find(doc! {"_id": {"$in": &follower_ids}})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let mut user_map: HashMap<ObjectId, User> = HashMap::new();
    while let Some(user) = user_cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database error"})),
        )
    })? {
        if let Some(id) = user.id {
            user_map.insert(id, user);
        }
    }

    let mut follower_entries: Vec<FollowListEntry> = Vec::new();
    for follower_id in follower_ids {
        if let Some(user) = user_map.get(&follower_id) {
            let is_viewer = matches!(viewer_id, Some(ref viewer) if viewer == &follower_id);
            let is_followed = viewer_follow_set.contains(&follower_id);

            follower_entries.push(FollowListEntry {
                user: user.clone(),
                is_followed_by_viewer: is_followed,
                is_viewer,
            });
        }
    }

    Ok(Json(FollowersListResponse {
        followers: follower_entries,
    }))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct FollowersListResponse {
    pub followers: Vec<FollowListEntry>,
}
