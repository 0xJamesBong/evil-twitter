use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection, Database,
};
use serde::Serialize;
use futures::TryStreamExt;
use utoipa::ToSchema;

use crate::models::user::{CreateUser, LoginRequest, LoginResponse, User};

#[derive(Debug, Serialize, ToSchema)]
pub struct UserListResponse {
    pub users: Vec<User>,
    pub total: i64,
}

/// Create a new user
#[utoipa::path(
    post,
    path = "/users",
    request_body = CreateUser,
    responses(
        (status = 201, description = "User created successfully", body = User),
        (status = 400, description = "Invalid input data"),
        (status = 409, description = "Username or email already exists")
    ),
    tag = "users"
)]
pub async fn create_user(
    State(db): State<Database>,
    Json(payload): Json<CreateUser>,
) -> Result<(StatusCode, Json<User>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<User> = db.collection("users");

    // Check if username or email already exists
    let existing_user = collection
        .find_one(doc! {
            "$or": [
                {"username": &payload.username},
                {"email": &payload.email}
            ]
        })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    if existing_user.is_some() {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({"error": "Username or email already exists"})),
        ));
    }

    let now = mongodb::bson::DateTime::now();
    let user = User {
        id: None,
        username: payload.username,
        display_name: payload.display_name,
        email: payload.email,
        avatar_url: payload.avatar_url,
        bio: payload.bio,
        created_at: now,
        followers_count: 0,
        following_count: 0,
        tweets_count: 0,
    };

    let result = collection.insert_one(&user).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Failed to create user"})),
        )
    })?;

    let mut created_user = user;
    created_user.id = Some(result.inserted_id.as_object_id().unwrap());

    Ok((StatusCode::CREATED, Json(created_user)))
}

/// Get user by ID
#[utoipa::path(
    get,
    path = "/users/{id}",
    params(
        ("id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User found", body = User),
        (status = 404, description = "User not found")
    ),
    tag = "users"
)]
pub async fn get_user(
    State(db): State<Database>,
    Path(id): Path<String>,
) -> Result<Json<User>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<User> = db.collection("users");
    let object_id = ObjectId::parse_str(&id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
    })?;

    let user = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    match user {
        Some(user) => Ok(Json(user)),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "User not found"})),
        )),
    }
}

/// Get all users
#[utoipa::path(
    get,
    path = "/users",
    responses(
        (status = 200, description = "Users list", body = UserListResponse)
    ),
    tag = "users"
)]
pub async fn get_users(
    State(db): State<Database>,
) -> Result<Json<UserListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<User> = db.collection("users");

    let cursor = collection
        .find(doc! {})
        .sort(doc! {"created_at": -1})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let users: Vec<User> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let total = users.len() as i64;

    Ok(Json(UserListResponse { users, total }))
}

/// Login user
#[utoipa::path(
    post,
    path = "/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 401, description = "Invalid credentials")
    ),
    tag = "auth"
)]
pub async fn login_user(
    State(db): State<Database>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<User> = db.collection("users");

    let user = collection
        .find_one(doc! {"email": &payload.email})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    match user {
        Some(user) => {
            // In production, verify password hash
            let token = format!("token_{}", user.id.unwrap().to_hex());
            
            Ok(Json(LoginResponse {
                token,
                user_id: user.id.unwrap().to_hex(),
                username: user.username,
                display_name: user.display_name,
            }))
        }
        None => Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid credentials"})),
        )),
    }
}