use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::app_state::AppState;

#[derive(Deserialize)]
pub struct DelegateSessionRequest {
    pub wallet: String,         // Base58 pubkey
    pub signature: String,      // Base64 signature
    pub session_pubkey: String, // Base58 session pubkey
    pub expires: i64,           // Unix timestamp
    pub message: String,        // Original message
}

#[derive(Serialize)]
pub struct DelegateSessionResponse {
    pub success: bool,
    pub message: String,
    // Echo back received data for testing/debugging
    pub received: Option<ReceivedData>,
}

#[derive(Serialize)]
pub struct ReceivedData {
    pub wallet: String,
    pub session_pubkey: String,
    pub expires: i64,
    pub message: String,
}

/// Dummy endpoint to receive session delegation request
/// Currently just logs and echoes back the data - no verification logic yet
/// Future: Will verify signature, generate/store session keypair, and use it for all transactions
pub async fn delegate_session(
    State(_app_state): State<Arc<AppState>>,
    Json(req): Json<DelegateSessionRequest>,
) -> Result<Json<DelegateSessionResponse>, (StatusCode, String)> {
    // Log received data for debugging
    eprintln!("📝 Received session delegation request:");
    eprintln!("   Wallet: {}", req.wallet);
    eprintln!("   Session Pubkey: {}", req.session_pubkey);
    eprintln!("   Expires: {}", req.expires);
    eprintln!("   Message: {}", req.message);
    eprintln!("   Signature (base64): {}", req.signature);

    // Dummy response - just echo back the data
    // TODO: In future, verify signature cryptographically
    // TODO: Generate/store session keypair
    // TODO: Use session keypair to sign all future transactions

    Ok(Json(DelegateSessionResponse {
        success: true,
        message: "Session delegation received (dummy endpoint - no verification yet)".to_string(),
        received: Some(ReceivedData {
            wallet: req.wallet,
            session_pubkey: req.session_pubkey,
            expires: req.expires,
            message: req.message,
        }),
    }))
}
