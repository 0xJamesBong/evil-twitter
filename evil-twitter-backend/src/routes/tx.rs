use axum::{Json, extract::State, http::StatusCode};
use base64::{Engine as _, engine::general_purpose};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;

use crate::app_state::AppState;

#[derive(Deserialize)]
pub struct CreateUserTxRequest {
    pub user_pubkey: String, // Base58 encoded user public key
}

#[derive(Serialize)]
pub struct CreateUserTxResponse {
    pub transaction: String,      // Base64 encoded partially-signed transaction
    pub user_account_pda: String, // Base58 encoded PDA for reference
}

/// Build and partially sign a createUser transaction
/// Backend signs as payer, user must sign as user authority
pub async fn create_user_tx(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<CreateUserTxRequest>,
) -> Result<Json<CreateUserTxResponse>, (StatusCode, String)> {
    // Parse user pubkey
    let user_pubkey = Pubkey::from_str(&req.user_pubkey).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid user pubkey: {}", e),
        )
    })?;

    // Build partially-signed transaction
    let (serialized_tx, user_account_pda) = app_state
        .solana_service
        .build_partial_signed_create_user_tx(user_pubkey)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CreateUserTxResponse {
        transaction: serialized_tx,
        user_account_pda: user_account_pda.to_string(),
    }))
}

#[derive(Serialize)]
pub struct PingTxResponse {
    pub transaction: String,
}

/// Build and partially sign a ping transaction
/// Backend signs as payer, user signs to prove they initiated it
pub async fn ping_tx(
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<PingTxResponse>, (StatusCode, String)> {
    let tx_base64 = app_state
        .solana_service
        .build_partial_signed_ping_tx()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PingTxResponse {
        transaction: tx_base64,
    }))
}

#[derive(Deserialize)]
pub struct PingSubmitRequest {
    pub transaction: String, // Base64 encoded user-signed transaction
}

#[derive(Serialize)]
pub struct PingSubmitResponse {
    pub signature: String, // Transaction signature
}

/// Receive user-signed ping transaction, optionally add backend payer signature, and broadcast
pub async fn ping_submit(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<PingSubmitRequest>,
) -> Result<Json<PingSubmitResponse>, (StatusCode, String)> {
    let signature = app_state
        .solana_service
        .submit_user_signed_tx(req.transaction)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to submit transaction: {}", e),
            )
        })?;

    Ok(Json(PingSubmitResponse {
        signature: signature.to_string(),
    }))
}

#[derive(Deserialize)]
pub struct CreateUserSubmitRequest {
    pub transaction: String, // Base64 encoded user-signed transaction
}

#[derive(Serialize)]
pub struct CreateUserSubmitResponse {
    pub signature: String, // Transaction signature
}

/// Receive user-signed createUser transaction, add backend payer signature, and broadcast
pub async fn create_user_submit(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<CreateUserSubmitRequest>,
) -> Result<Json<CreateUserSubmitResponse>, (StatusCode, String)> {
    let signature = app_state
        .solana_service
        .submit_user_signed_tx(req.transaction)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to submit transaction: {}", e),
            )
        })?;

    Ok(Json(CreateUserSubmitResponse {
        signature: signature.to_string(),
    }))
}
