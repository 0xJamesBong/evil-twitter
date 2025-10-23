use axum::{
    Json,
    http::{HeaderMap, StatusCode},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use mongodb::{Collection, Database};
use serde_json::{Value, json};

use crate::models::user::User;

type ApiError = (StatusCode, Json<Value>);

fn json_error(status: StatusCode, message: impl Into<String>) -> ApiError {
    (status, Json(json!({ "error": message.into() })))
}

fn internal_error(message: &str) -> ApiError {
    json_error(StatusCode::INTERNAL_SERVER_ERROR, message)
}

fn not_found(message: &str) -> ApiError {
    json_error(StatusCode::NOT_FOUND, message)
}

/// Extract the authenticated user from the authorization header
pub async fn get_authenticated_user(db: &Database, headers: &HeaderMap) -> Result<User, ApiError> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| json_error(StatusCode::UNAUTHORIZED, "Missing authorization header"))?;

    let supabase_id = extract_supabase_id_from_auth_header(auth_header).map_err(|err| {
        json_error(
            StatusCode::UNAUTHORIZED,
            format!("Invalid authorization token: {err}"),
        )
    })?;

    let user_collection: Collection<User> = db.collection("users");
    let user = user_collection
        .find_one(mongodb::bson::doc! {"supabase_id": supabase_id})
        .await
        .map_err(|_| internal_error("Database error fetching user"))?
        .ok_or_else(|| not_found("User not found"))?;

    Ok(user)
}

/// Extract the authenticated user's ObjectId from the authorization header
pub async fn get_authenticated_user_id(
    db: &Database,
    headers: &HeaderMap,
) -> Result<mongodb::bson::oid::ObjectId, ApiError> {
    let user = get_authenticated_user(db, headers).await?;
    user.id
        .ok_or_else(|| internal_error("User record missing identifier"))
}

/// Extract Supabase ID from JWT token in authorization header
fn extract_supabase_id_from_auth_header(auth_header: &str) -> Result<String, String> {
    let token = match auth_header.strip_prefix("Bearer ") {
        Some(t) => t.trim(),
        None => return Err("Authorization header is not Bearer".into()),
    };

    let token = token
        .split_whitespace()
        .next()
        .ok_or_else(|| "Empty bearer token".to_string())?;
    let token = token
        .split('/')
        .next()
        .ok_or_else(|| "Malformed bearer token".to_string())?;

    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("JWT must have three parts".into());
    }

    let payload_b64 = parts[1];
    let decoded = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|e| format!("base64 decode error: {e}"))?;

    let payload: serde_json::Value =
        serde_json::from_slice(&decoded).map_err(|e| format!("payload JSON parse error: {e}"))?;

    if let Some(sub) = payload.get("sub").and_then(|v| v.as_str()) {
        return Ok(sub.to_string());
    }

    if let Some(sub) = payload
        .get("user")
        .and_then(|user| user.get("id").or_else(|| user.get("sub")))
        .and_then(|v| v.as_str())
    {
        return Ok(sub.to_string());
    }

    if let Some(sub) = payload
        .get("user_metadata")
        .and_then(|user| user.get("sub"))
        .and_then(|v| v.as_str())
    {
        return Ok(sub.to_string());
    }

    Err("Could not find `sub` in token payload".into())
}
