use axum::{Json, extract::State, http::StatusCode};
use bs58;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::sync::Arc;

use base64::{Engine as _, engine::general_purpose};
use solana_sdk::pubkey::Pubkey;

use crate::{app_state::AppState, solana::read_keypair_from_file};
use opinions_market::pda_seeds::SESSION_AUTHORITY_SEED;

#[derive(Deserialize)]
pub struct SessionInitRequest {
    pub wallet: String,    // real wallet
    pub signature: String, // signature to prove identity
    pub expires: i64,      // expiry time (front-end chosen)
    pub message: String,
}

#[derive(Serialize)]
pub struct SessionInitResponse {
    pub tx_base64: String,
    pub session_authority_pda: String,
    pub expires_at: i64,
}

pub async fn session_init(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<SessionInitRequest>,
) -> std::result::Result<Json<SessionInitResponse>, (StatusCode, String)> {
    // -------------------------------
    // 1) Decode & verify signature
    // -------------------------------
    let wallet_pubkey_bytes = bs58::decode(&req.wallet)
        .into_vec()
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid wallet pubkey".to_string()))?;

    let wallet_pubkey_bytes: [u8; 32] = wallet_pubkey_bytes.try_into().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Pubkey must be 32 bytes".to_string(),
        )
    })?;

    let verifying_key = VerifyingKey::from_bytes(&wallet_pubkey_bytes)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid verifying key".to_string()))?;

    let signature_bytes = bs58::decode(&req.signature).into_vec().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid signature format".to_string(),
        )
    })?;

    let signature = Signature::from_slice(&signature_bytes).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid signature bytes".to_string(),
        )
    })?;

    verifying_key
        .verify(req.message.as_bytes(), &signature)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Signature verification failed".to_string(),
            )
        })?;

    println!("🔐 Signature verified from wallet {}", req.wallet);

    // -------------------------------
    // 2) Derive PDA for SessionAuthority
    // -------------------------------
    let wallet_pubkey = Pubkey::from_str(&req.wallet).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid wallet pubkey: {}", e),
        )
    })?;
    // read from .secrets
    //
    // Load session keypair (backend-controlled)
    let session_keypair = read_keypair_from_file(
        &std::env::var("SOLANA_SESSION_KEY_KEYPAIR_PATH")
            .expect("Missing SOLANA_SESSION_KEY_KEYPAIR_PATH"),
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read session keypair: {}", e),
        )
    })?;

    // Public key used on-chain
    let session_key = session_keypair.pubkey();

    // Get program_id from solana_service - we need to access it via a method or derive it
    // For now, let's use the opinions_market program to get the program_id
    let program = app_state.solana_service.opinions_market_program();
    let program_id = program.id();

    let (session_authority_pda, _bump) = Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            wallet_pubkey.as_ref(),
            session_key.as_ref(),
        ],
        &program_id,
    );

    println!("📍 SessionAuthority PDA: {}", session_authority_pda);

    // -------------------------------
    // 3) Build Anchor instruction
    // -------------------------------
    let expires_at = req.expires;

    let ixs = program
        .request()
        .accounts(opinions_market::accounts::RegisterSessionKey {
            user: wallet_pubkey,
            session_authority: session_authority_pda,
            system_program: solana_sdk::system_program::ID,
        })
        .args(opinions_market::instruction::RegisterSessionKey {
            session_key,
            expires_at,
            privileges_hash: [0u8; 32], // temporary placeholder
        })
        .instructions()
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to build instruction: {}", e),
            )
        })?;

    // -------------------------------
    // 4) Build backend-paid VersionedTransaction
    // -------------------------------
    let tx = app_state
        .solana_service
        .build_partial_signed_tx(ixs)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to build transaction: {}", e),
            )
        })?;

    let tx_bytes = bincode::serialize(&tx).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to serialize transaction: {}", e),
        )
    })?;

    let tx_base64 = general_purpose::STANDARD.encode(&tx_bytes);

    // -------------------------------
    // 5) Return to frontend
    // -------------------------------
    Ok(Json(SessionInitResponse {
        tx_base64,
        session_authority_pda: session_authority_pda.to_string(),
        expires_at,
    }))
}
