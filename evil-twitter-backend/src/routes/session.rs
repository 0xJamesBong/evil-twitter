use axum::{Json, extract::State, http::StatusCode};
use bs58;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::app_state::AppState;

#[derive(Deserialize)]
pub struct DelegateSessionRequest {
    pub wallet: String,
    pub signature: String, // Base58 signature
    pub session_pubkey: String,
    pub expires: i64,
    pub message: String,
}

#[derive(Serialize)]
pub struct DelegateSessionResponse {
    pub success: bool,
    pub message: String,
    pub received: Option<ReceivedData>,
}

#[derive(Serialize)]
pub struct ReceivedData {
    pub wallet: String,
    pub session_pubkey: String,
    pub expires: i64,
    pub message: String,
}

pub async fn delegate_session(
    State(_app_state): State<Arc<AppState>>,
    Json(req): Json<DelegateSessionRequest>,
) -> Result<Json<DelegateSessionResponse>, (StatusCode, String)> {
    // Decode wallet pubkey
    let wallet_pubkey_bytes = bs58::decode(&req.wallet).into_vec().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid wallet pubkey: {}", e),
        )
    })?;

    // Decode wallet pubkey
    let wallet_pubkey_vec = bs58::decode(&req.wallet).into_vec().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid wallet pubkey: {}", e),
        )
    })?;

    // Convert Vec<u8> → [u8; 32]
    let wallet_pubkey_bytes: [u8; 32] = wallet_pubkey_vec.try_into().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Pubkey must be 32 bytes".to_string(),
        )
    })?;

    // Build verifying key
    let verifying_key = VerifyingKey::from_bytes(&wallet_pubkey_bytes).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid pubkey bytes: {}", e),
        )
    })?;

    // Decode signature
    let signature_bytes = bs58::decode(&req.signature)
        .into_vec()
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid signature: {}", e)))?;

    let signature = Signature::from_slice(&signature_bytes).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid signature bytes: {}", e),
        )
    })?;

    // Verify signature
    verifying_key
        .verify(req.message.as_bytes(), &signature)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Signature verification failed".to_string(),
            )
        })?;

    // If we reach here → VALID signature
    println!(
        "✅ Signature verification succeeded for wallet {}",
        req.wallet
    );

    Ok(Json(DelegateSessionResponse {
        success: true,
        message: "Signature verified successfully".to_string(),
        received: Some(ReceivedData {
            wallet: req.wallet,
            session_pubkey: req.session_pubkey,
            expires: req.expires,
            message: req.message,
        }),
    }))
}
