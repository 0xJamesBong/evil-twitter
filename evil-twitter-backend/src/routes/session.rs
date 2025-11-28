use axum::{Json, extract::State, http::StatusCode};
use bs58;
use chrono;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::sync::Arc;

use base64::{Engine as _, engine::general_purpose};
use solana_sdk::{pubkey::Pubkey, signature::Keypair, signer::Signer};

use crate::{app_state::AppState, solana::read_keypair_from_file};
use opinions_market::{pda_seeds::SESSION_AUTHORITY_SEED, state::SessionAuthority};

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
) -> Result<Json<SessionInitResponse>, (StatusCode, String)> {
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

    let wallet_pubkey = Pubkey::from_str(&req.wallet).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid wallet pubkey: {}", e),
        )
    })?;

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

    let session_key = session_keypair.pubkey();
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
            privileges_hash: [0u8; 32],
        })
        .instructions()
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to build instruction: {}", e),
            )
        })?;

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

    Ok(Json(SessionInitResponse {
        tx_base64,
        session_authority_pda: session_authority_pda.to_string(),
        expires_at,
    }))
}

#[derive(Deserialize)]
pub struct SessionSubmitRequest {
    pub transaction: String, // Base64 encoded user-signed transaction
}

#[derive(Serialize)]
pub struct SessionSubmitResponse {
    pub signature: String, // Transaction signature
}

/// Receive user-signed session registration transaction and broadcast
pub async fn session_submit(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<SessionSubmitRequest>,
) -> Result<Json<SessionSubmitResponse>, (StatusCode, String)> {
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

    Ok(Json(SessionSubmitResponse {
        signature: signature.to_string(),
    }))
}

/// Helper function to fetch and verify session authority
async fn get_and_verify_session(
    app_state: &Arc<AppState>,
    session_authority_pda: &Pubkey,
) -> std::result::Result<(Pubkey, Keypair), (StatusCode, String)> {
    // Load session keypair
    let session_keypair = read_keypair_from_file(
        &std::env::var("SOLANA_SESSION_KEY_KEYPAIR_PATH").map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Missing SOLANA_SESSION_KEY_KEYPAIR_PATH".to_string(),
            )
        })?,
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to read session keypair: {}", e),
        )
    })?;

    // Fetch session authority account from chain
    let program = app_state.solana_service.opinions_market_program();
    let session_authority = program
        .account::<SessionAuthority>(*session_authority_pda)
        .await
        .map_err(|e| {
            (
                StatusCode::NOT_FOUND,
                format!("Session authority not found: {}", e),
            )
        })?;

    // Verify session is not expired
    let now = chrono::Utc::now().timestamp();
    if now >= session_authority.expires_at {
        return Err((StatusCode::UNAUTHORIZED, "Session has expired".to_string()));
    }

    // Verify session key matches
    if session_authority.session_key != session_keypair.pubkey() {
        return Err((StatusCode::UNAUTHORIZED, "Session key mismatch".to_string()));
    }

    Ok((session_authority.user, session_keypair))
}

#[derive(Deserialize)]
pub struct CreateUserSessionRequest {
    pub session_authority_pda: String, // Base58 encoded session authority PDA
}

#[derive(Serialize)]
pub struct CreateUserSessionResponse {
    pub signature: String, // Transaction signature
}

/// Create user account using session signing (no frontend signing required)
pub async fn create_user_session(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<CreateUserSessionRequest>,
) -> Result<Json<CreateUserSessionResponse>, (StatusCode, String)> {
    // Parse session authority PDA
    let session_authority_pda = Pubkey::from_str(&req.session_authority_pda).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid session authority PDA: {}", e),
        )
    })?;

    // Get and verify session
    let (user_wallet, session_keypair) =
        get_and_verify_session(&app_state, &session_authority_pda).await?;

    println!("✅ Session verified for user {}", user_wallet);

    // Build CreateUser instruction
    let program = app_state.solana_service.opinions_market_program();
    let program_id = program.id();

    let (config_pda, _) = crate::solana::get_config_pda(&program_id);
    let (user_account_pda, _) = crate::solana::get_user_account_pda(&program_id, &user_wallet);

    let ixs = program
        .request()
        .accounts(opinions_market::accounts::CreateUser {
            config: config_pda,
            user: user_wallet,
            payer: app_state.solana_service.payer_pubkey(),
            user_account: user_account_pda,
            system_program: solana_sdk::system_program::ID,
        })
        .args(opinions_market::instruction::CreateUser {})
        .instructions()
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to build instruction: {}", e),
            )
        })?;

    // Build transaction signed by both payer and session keypair
    let tx = app_state
        .solana_service
        .build_session_signed_tx(ixs, &session_keypair)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to build transaction: {}", e),
            )
        })?;

    // Broadcast transaction
    let signature = app_state
        .solana_service
        .send_signed_tx(&tx)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to broadcast transaction: {}", e),
            )
        })?;

    Ok(Json(CreateUserSessionResponse {
        signature: signature.to_string(),
    }))
}
