use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::{DateTime, Utc};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{DateTime as BsonDateTime, doc, oid::ObjectId},
};
use serde_json::{Value, json};
use utoipa::ToSchema;

use crate::models::follow::{
    Follow, FollowRequest, FollowResponse, FollowStats, IntimateFollow,
    IntimateFollowActionRequest, IntimateFollowActionResponse, IntimateFollowRequest,
    IntimateFollowRequestStatus, IntimateFollowStatus,
};
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

/// Remove an intimate follower from your list.
#[utoipa::path(
    delete,
    path = "/users/{user_id}/intimate-follow",
    params(
        ("user_id" = String, Path, description = "User ID that owns the account")
    ),
    request_body = IntimateFollowActionRequest,
    responses(
        (status = 200, description = "Intimate follower removed", body = IntimateFollowActionResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn eject_intimate_follower(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<IntimateFollowActionRequest>,
) -> Result<Json<IntimateFollowActionResponse>, ApiError> {
    let intimate_collection: Collection<IntimateFollow> = db.collection("intimate_follows");
    let request_collection: Collection<IntimateFollowRequest> =
        db.collection("intimate_follow_requests");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid target user ID"})),
        )
    })?;
    let follower_id = ObjectId::parse_str(&payload.requester_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid follower user ID"})),
        )
    })?;

    let target_user = user_collection
        .find_one(doc! {"_id": target_id})
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
                Json(json!({"error": "Target user not found"})),
            )
        })?;

    let follower_user = user_collection
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

    let delete_result = intimate_collection
        .delete_one(doc! {"follower_id": follower_id, "following_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to remove intimate follower"})),
            )
        })?;

    if delete_result.deleted_count == 0 {
        return Ok(Json(IntimateFollowActionResponse {
            success: true,
            message: format!(
                "{} is not currently an intimate follower",
                follower_user.display_name
            ),
            relationship_status: Some(IntimateFollowRequestStatus::Rejected),
            is_intimate_follower: false,
        }));
    }

    user_collection
        .update_one(
            doc! {"_id": target_id},
            doc! {"$inc": {"intimate_followers_count": -1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to update counters"})),
            )
        })?;

    // Mark any outstanding request as rejected so the follower must request again.
    if let Some(existing_request) = request_collection
        .find_one(doc! {"requester_id": follower_id, "target_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
    {
        if let Some(request_id) = existing_request.id {
            request_collection
                .update_one(
                    doc! {"_id": request_id},
                    doc! {
                        "$set": {
                            "status": IntimateFollowRequestStatus::Rejected.as_str(),
                            "updated_at": BsonDateTime::from_chrono(Utc::now()),
                        },
                    },
                )
                .await
                .map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({"error": "Failed to update request status"})),
                    )
                })?;
        }
    }

    Ok(Json(IntimateFollowActionResponse {
        success: true,
        message: format!(
            "Removed {} from your intimate followers",
            follower_user.display_name
        ),
        relationship_status: Some(IntimateFollowRequestStatus::Rejected),
        is_intimate_follower: false,
    }))
}

/// Retrieve intimate follow status between two users.
#[utoipa::path(
    get,
    path = "/users/{user_id}/intimate-follow/status",
    params(
        ("user_id" = String, Path, description = "Target user ID to check status against"),
        ("follower_id" = String, Query, description = "Viewer user ID performing the lookup")
    ),
    responses(
        (status = 200, description = "Status retrieved", body = IntimateFollowStatus),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn get_intimate_follow_status(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<IntimateFollowStatus>, ApiError> {
    let intimate_collection: Collection<IntimateFollow> = db.collection("intimate_follows");
    let request_collection: Collection<IntimateFollowRequest> =
        db.collection("intimate_follow_requests");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid target user ID"})),
        )
    })?;

    let follower_param = params.get("follower_id").ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Missing follower_id parameter"})),
        )
    })?;

    let follower_id = ObjectId::parse_str(follower_param).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid follower user ID"})),
        )
    })?;

    // Ensure both users exist to provide consistent errors
    user_collection
        .find_one(doc! {"_id": target_id})
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
                Json(json!({"error": "Target user not found"})),
            )
        })?;

    user_collection
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

    let is_intimate_follower = intimate_collection
        .find_one(doc! {"follower_id": follower_id, "following_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .is_some();

    let request_status = request_collection
        .find_one(doc! {"requester_id": follower_id, "target_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let request_status_value = request_status.map(|r| r.status);
    let has_pending_request = matches!(
        request_status_value.as_ref(),
        Some(IntimateFollowRequestStatus::Pending)
    );

    let status = IntimateFollowStatus {
        is_intimate_follower,
        has_pending_request,
        request_status: request_status_value,
    };

    Ok(Json(status))
}
/// Reject an intimate follow request.
#[utoipa::path(
    post,
    path = "/users/{user_id}/intimate-follow/reject",
    params(
        ("user_id" = String, Path, description = "User ID that owns the account being requested")
    ),
    request_body = IntimateFollowActionRequest,
    responses(
        (status = 200, description = "Intimate follow request rejected", body = IntimateFollowActionResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Request not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn reject_intimate_follow(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<IntimateFollowActionRequest>,
) -> Result<Json<IntimateFollowActionResponse>, ApiError> {
    let request_collection: Collection<IntimateFollowRequest> =
        db.collection("intimate_follow_requests");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid target user ID"})),
        )
    })?;
    let requester_id = ObjectId::parse_str(&payload.requester_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid requester user ID"})),
        )
    })?;

    let target_user = user_collection
        .find_one(doc! {"_id": target_id})
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
                Json(json!({"error": "Target user not found"})),
            )
        })?;

    let requester_user = user_collection
        .find_one(doc! {"_id": requester_id})
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
                Json(json!({"error": "Requester user not found"})),
            )
        })?;

    let Some(existing_request) = request_collection
        .find_one(doc! {"requester_id": requester_id, "target_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
    else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({"error": "No intimate follow request found"})),
        ));
    };

    if existing_request.status == IntimateFollowRequestStatus::Rejected {
        return Ok(Json(IntimateFollowActionResponse {
            success: true,
            message: "This intimate follow request was already rejected".into(),
            relationship_status: Some(IntimateFollowRequestStatus::Rejected),
            is_intimate_follower: false,
        }));
    }

    if existing_request.status == IntimateFollowRequestStatus::Approved {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Cannot reject an already approved intimate follower"})),
        ));
    }

    if let Some(request_id) = existing_request.id {
        request_collection
            .update_one(
                doc! {"_id": request_id},
                doc! {
                    "$set": {
                        "status": IntimateFollowRequestStatus::Rejected.as_str(),
                        "updated_at": BsonDateTime::from_chrono(Utc::now()),
                    },
                },
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to update request"})),
                )
            })?;
    }

    user_collection
        .update_one(
            doc! {"_id": target_id},
            doc! {"$inc": {"intimate_follow_requests_count": -1}},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Failed to update counters"})),
            )
        })?;

    Ok(Json(IntimateFollowActionResponse {
        success: true,
        message: format!(
            "Rejected intimate access request from {}",
            requester_user.display_name
        ),
        relationship_status: Some(IntimateFollowRequestStatus::Rejected),
        is_intimate_follower: false,
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

/// Submit an intimate follow request to another user.
#[utoipa::path(
    post,
    path = "/users/{user_id}/intimate-follow/request",
    params(
        ("user_id" = String, Path, description = "Target user ID to request intimate follow access for")
    ),
    request_body = IntimateFollowActionRequest,
    responses(
        (status = 200, description = "Request processed", body = IntimateFollowActionResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn request_intimate_follow(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<IntimateFollowActionRequest>,
) -> Result<Json<IntimateFollowActionResponse>, ApiError> {
    let request_collection: Collection<IntimateFollowRequest> =
        db.collection("intimate_follow_requests");
    let intimate_collection: Collection<IntimateFollow> = db.collection("intimate_follows");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid target user ID"})),
        )
    })?;
    let requester_id = ObjectId::parse_str(&payload.requester_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid requester user ID"})),
        )
    })?;

    if requester_id == target_id {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "You cannot send an intimate follow request to yourself"})),
        ));
    }

    let target_user = user_collection
        .find_one(doc! {"_id": target_id})
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
                Json(json!({"error": "Target user not found"})),
            )
        })?;

    let _requester_user = user_collection
        .find_one(doc! {"_id": requester_id})
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
                Json(json!({"error": "Requester user not found"})),
            )
        })?;

    // Already an approved intimate follower?
    if intimate_collection
        .find_one(doc! {"follower_id": requester_id, "following_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .is_some()
    {
        return Ok(Json(IntimateFollowActionResponse {
            success: true,
            message: format!(
                "You already have intimate access to {}",
                target_user.display_name
            ),
            relationship_status: Some(IntimateFollowRequestStatus::Approved),
            is_intimate_follower: true,
        }));
    }

    let now = Utc::now();
    let mut should_increment_pending = false;

    match request_collection
        .find_one(doc! {"requester_id": requester_id, "target_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })? {
        Some(existing) => match existing.status {
            IntimateFollowRequestStatus::Pending => {
                return Ok(Json(IntimateFollowActionResponse {
                    success: true,
                    message: "Your intimate follow request is already pending approval".into(),
                    relationship_status: Some(IntimateFollowRequestStatus::Pending),
                    is_intimate_follower: false,
                }));
            }
            IntimateFollowRequestStatus::Approved => {
                return Ok(Json(IntimateFollowActionResponse {
                    success: true,
                    message: format!(
                        "You already have intimate access to {}",
                        target_user.display_name
                    ),
                    relationship_status: Some(IntimateFollowRequestStatus::Approved),
                    is_intimate_follower: true,
                }));
            }
            IntimateFollowRequestStatus::Rejected => {
                if let Some(request_id) = existing.id {
                    request_collection
                        .update_one(
                            doc! {"_id": request_id},
                            doc! {
                                "$set": {
                                    "status": IntimateFollowRequestStatus::Pending.as_str(),
                                    "updated_at": BsonDateTime::from_chrono(now),
                                },
                            },
                        )
                        .await
                        .map_err(|_| {
                            (
                                StatusCode::INTERNAL_SERVER_ERROR,
                                Json(json!({"error": "Failed to update request"})),
                            )
                        })?;
                    should_increment_pending = true;
                }
            }
        },
        None => {
            let request = IntimateFollowRequest {
                id: None,
                requester_id,
                target_id,
                status: IntimateFollowRequestStatus::Pending,
                created_at: now,
                updated_at: now,
            };

            request_collection.insert_one(&request).await.map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to create intimate follow request"})),
                )
            })?;
            should_increment_pending = true;
        }
    }

    if should_increment_pending {
        user_collection
            .update_one(
                doc! {"_id": target_id},
                doc! {"$inc": {"intimate_follow_requests_count": 1}},
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to update request counters"})),
                )
            })?;
    }

    Ok(Json(IntimateFollowActionResponse {
        success: true,
        message: format!(
            "Intimate access request sent to {}",
            target_user.display_name
        ),
        relationship_status: Some(IntimateFollowRequestStatus::Pending),
        is_intimate_follower: false,
    }))
}

/// Approve an intimate follow request.
#[utoipa::path(
    post,
    path = "/users/{user_id}/intimate-follow/approve",
    params(
        ("user_id" = String, Path, description = "User ID that owns the account being followed intimately")
    ),
    request_body = IntimateFollowActionRequest,
    responses(
        (status = 200, description = "Intimate follow request approved", body = IntimateFollowActionResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Request not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn approve_intimate_follow(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<IntimateFollowActionRequest>,
) -> Result<Json<IntimateFollowActionResponse>, ApiError> {
    let request_collection: Collection<IntimateFollowRequest> =
        db.collection("intimate_follow_requests");
    let intimate_collection: Collection<IntimateFollow> = db.collection("intimate_follows");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid target user ID"})),
        )
    })?;
    let requester_id = ObjectId::parse_str(&payload.requester_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid requester user ID"})),
        )
    })?;

    let target_user = user_collection
        .find_one(doc! {"_id": target_id})
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
                Json(json!({"error": "Target user not found"})),
            )
        })?;

    let requester_user = user_collection
        .find_one(doc! {"_id": requester_id})
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
                Json(json!({"error": "Requester user not found"})),
            )
        })?;

    let Some(existing_request) = request_collection
        .find_one(doc! {"requester_id": requester_id, "target_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
    else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({"error": "No intimate follow request found"})),
        ));
    };

    if existing_request.status == IntimateFollowRequestStatus::Approved {
        return Ok(Json(IntimateFollowActionResponse {
            success: true,
            message: format!(
                "{} is already an intimate follower",
                requester_user.display_name
            ),
            relationship_status: Some(IntimateFollowRequestStatus::Approved),
            is_intimate_follower: true,
        }));
    }

    if existing_request.status == IntimateFollowRequestStatus::Rejected {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Cannot approve a rejected request"})),
        ));
    }

    let mut inserted_relationship = false;
    if intimate_collection
        .find_one(doc! {"follower_id": requester_id, "following_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?
        .is_none()
    {
        let relationship = IntimateFollow {
            id: None,
            follower_id: requester_id,
            following_id: target_id,
            created_at: Utc::now(),
        };

        intimate_collection
            .insert_one(&relationship)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to persist intimate follow"})),
                )
            })?;
        inserted_relationship = true;
    }

    let now = Utc::now();
    if let Some(request_id) = existing_request.id {
        request_collection
            .update_one(
                doc! {"_id": request_id},
                doc! {
                    "$set": {
                        "status": IntimateFollowRequestStatus::Approved.as_str(),
                        "updated_at": BsonDateTime::from_chrono(now),
                    },
                },
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to update request status"})),
                )
            })?;
    }

    let mut inc_doc = doc! {};
    if inserted_relationship {
        inc_doc.insert("intimate_followers_count", 1);
    }
    // Only decrement pending count if it was actually pending.
    if existing_request.status == IntimateFollowRequestStatus::Pending {
        inc_doc.insert("intimate_follow_requests_count", -1);
    }

    if !inc_doc.is_empty() {
        user_collection
            .update_one(doc! {"_id": target_id}, doc! {"$inc": inc_doc})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to update counters"})),
                )
            })?;
    }

    Ok(Json(IntimateFollowActionResponse {
        success: true,
        message: format!(
            "Approved intimate access for {}",
            requester_user.display_name
        ),
        relationship_status: Some(IntimateFollowRequestStatus::Approved),
        is_intimate_follower: true,
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

/// List intimate followers for a given user.
#[utoipa::path(
    get,
    path = "/users/{user_id}/intimate-followers",
    params(
        ("user_id" = String, Path, description = "User ID to list intimate followers for")
    ),
    responses(
        (status = 200, description = "Intimate followers retrieved", body = IntimateFollowersListResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn get_intimate_followers_list(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Json<IntimateFollowersListResponse>, ApiError> {
    let intimate_collection: Collection<IntimateFollow> = db.collection("intimate_follows");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;

    user_collection
        .find_one(doc! {"_id": target_id})
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

    let mut cursor = intimate_collection
        .find(doc! {"following_id": target_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let mut follower_ids = Vec::new();
    while let Some(entry) = cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database error"})),
        )
    })? {
        follower_ids.push(entry.follower_id);
    }

    let mut followers = Vec::new();
    if !follower_ids.is_empty() {
        let mut user_cursor = user_collection
            .find(doc! {"_id": {"$in": &follower_ids}})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?;

        while let Some(user) = user_cursor.try_next().await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })? {
            followers.push(user);
        }
    }

    Ok(Json(IntimateFollowersListResponse { followers }))
}

/// List pending intimate follow requests for a user.
#[utoipa::path(
    get,
    path = "/users/{user_id}/intimate-follow/requests",
    params(
        ("user_id" = String, Path, description = "User ID to fetch pending intimate follow requests for")
    ),
    responses(
        (status = 200, description = "Pending requests retrieved", body = IntimateFollowRequestsResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "follows"
)]
pub async fn get_intimate_follow_requests(
    State(db): State<Database>,
    Path(user_id): Path<String>,
) -> Result<Json<IntimateFollowRequestsResponse>, ApiError> {
    let request_collection: Collection<IntimateFollowRequest> =
        db.collection("intimate_follow_requests");
    let user_collection: Collection<User> = db.collection("users");

    let target_id = ObjectId::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Invalid user ID"})),
        )
    })?;

    user_collection
        .find_one(doc! {"_id": target_id})
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

    let mut cursor = request_collection
        .find(
            doc! {"target_id": target_id, "status": IntimateFollowRequestStatus::Pending.as_str()},
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Database error"})),
            )
        })?;

    let mut entries = Vec::new();
    while let Some(request) = cursor.try_next().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database error"})),
        )
    })? {
        if let Some(user) = user_collection
            .find_one(doc! {"_id": request.requester_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?
        {
            entries.push(IntimateFollowRequestEntry {
                user,
                requested_at: request.created_at,
                status: request.status,
            });
        }
    }

    Ok(Json(IntimateFollowRequestsResponse { requests: entries }))
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

    // Get user details for each following ID
    let mut following_users = Vec::new();
    for following_id in following_ids {
        if let Some(user) = user_collection
            .find_one(doc! {"_id": following_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?
        {
            following_users.push(user);
        }
    }

    Ok(Json(FollowingListResponse {
        following: following_users,
    }))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct FollowingListResponse {
    pub following: Vec<User>,
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

    // Get user details for each follower ID
    let mut follower_users = Vec::new();
    for follower_id in follower_ids {
        if let Some(user) = user_collection
            .find_one(doc! {"_id": follower_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Database error"})),
                )
            })?
        {
            follower_users.push(user);
        }
    }

    Ok(Json(FollowersListResponse {
        followers: follower_users,
    }))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct FollowersListResponse {
    pub followers: Vec<User>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct IntimateFollowersListResponse {
    pub followers: Vec<User>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct IntimateFollowRequestEntry {
    pub user: User,
    pub requested_at: DateTime<Utc>,
    pub status: IntimateFollowRequestStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct IntimateFollowRequestsResponse {
    pub requests: Vec<IntimateFollowRequestEntry>,
}
