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
        .build_create_user_tx(&user_pubkey)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CreateUserTxResponse {
        transaction: serialized_tx,
        user_account_pda: user_account_pda.to_string(),
    }))
}
