use axum::{Json, extract::State, http::StatusCode};
use bs58;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::sync::Arc;

use base64::{Engine as _, engine::general_purpose};
use hex;
use solana_sdk::pubkey::Pubkey;

use crate::{app_state::AppState, solana::read_keypair_from_file};
use opinions_market::pda_seeds::SESSION_AUTHORITY_SEED;

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub user_wallet: String, // Base58 encoded pubkey
}

#[derive(Serialize)]
pub struct CreateUserResponse {
    pub signature: String, // Transaction signature
}

#[derive(Deserialize)]
pub struct CreatePostRequest {
    pub user_wallet: String,             // Base58 encoded pubkey
    pub post_id_hash: String,            // Hex encoded [u8; 32]
    pub parent_post_pda: Option<String>, // Optional Base58 encoded pubkey
}

#[derive(Serialize)]
pub struct CreatePostResponse {
    pub signature: String, // Transaction signature
}

/// Create user account on-chain, signed by backend payer only
pub async fn create_user(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<CreateUserResponse>, (StatusCode, String)> {
    println!(
        "📝 create_user: Received request for user_wallet: {}",
        req.user_wallet
    );

    // Parse user wallet pubkey
    let user_wallet = Pubkey::from_str(&req.user_wallet).map_err(|e| {
        eprintln!("❌ create_user: Invalid user wallet pubkey: {}", e);
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid user wallet pubkey: {}", e),
        )
    })?;

    println!("✅ create_user: Parsed user wallet: {}", user_wallet);
    println!("🚀 create_user: Calling solana_service.create_user()...");

    // Create user account on-chain
    let signature = app_state
        .solana_service
        .create_user(user_wallet)
        .await
        .map_err(|e| {
            eprintln!("❌ create_user: Failed to create user on-chain: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create user: {}", e),
            )
        })?;

    println!(
        "✅ create_user: User account created successfully! Signature: {}",
        signature
    );
    println!("📋 create_user: Returning response to client");

    Ok(Json(CreateUserResponse {
        signature: signature.to_string(),
    }))
}

/// Create post account on-chain, signed by backend payer only
pub async fn create_post(
    State(app_state): State<Arc<AppState>>,
    Json(req): Json<CreatePostRequest>,
) -> Result<Json<CreatePostResponse>, (StatusCode, String)> {
    println!(
        "📝 create_post: Received request for user_wallet: {}, post_id_hash: {}",
        req.user_wallet, req.post_id_hash
    );

    // Parse user wallet pubkey
    let user_wallet = Pubkey::from_str(&req.user_wallet).map_err(|e| {
        eprintln!("❌ create_post: Invalid user wallet pubkey: {}", e);
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid user wallet pubkey: {}", e),
        )
    })?;

    // Parse post_id_hash from hex to [u8; 32]
    let post_id_hash_bytes = hex::decode(&req.post_id_hash).map_err(|e| {
        eprintln!("❌ create_post: Invalid post_id_hash hex: {}", e);
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid post_id_hash hex: {}", e),
        )
    })?;

    if post_id_hash_bytes.len() != 32 {
        eprintln!(
            "❌ create_post: post_id_hash must be 32 bytes, got {}",
            post_id_hash_bytes.len()
        );
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "post_id_hash must be 32 bytes, got {}",
                post_id_hash_bytes.len()
            ),
        ));
    }

    let mut post_id_hash = [0u8; 32];
    post_id_hash.copy_from_slice(&post_id_hash_bytes);

    // Parse optional parent_post_pda
    let parent_post_pda = if let Some(parent_str) = req.parent_post_pda {
        Some(Pubkey::from_str(&parent_str).map_err(|e| {
            eprintln!("❌ create_post: Invalid parent_post_pda: {}", e);
            (
                StatusCode::BAD_REQUEST,
                format!("Invalid parent_post_pda: {}", e),
            )
        })?)
    } else {
        None
    };

    println!("✅ create_post: Parsed user wallet: {}", user_wallet);
    println!(
        "✅ create_post: Parsed post_id_hash: {}",
        hex::encode(post_id_hash)
    );
    if let Some(parent) = parent_post_pda {
        println!("✅ create_post: Parsed parent_post_pda: {}", parent);
    }
    println!("🚀 create_post: Calling solana_service.create_post()...");

    // Create post account on-chain
    let signature = app_state
        .solana_service
        .create_post(user_wallet, post_id_hash, parent_post_pda)
        .await
        .map_err(|e| {
            eprintln!("❌ create_post: Failed to create post on-chain: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to create post: {}", e),
            )
        })?;

    println!(
        "✅ create_post: Post account created successfully! Signature: {}",
        signature
    );
    println!("📋 create_post: Returning response to client");

    Ok(Json(CreatePostResponse {
        signature: signature.to_string(),
    }))
}

// #[derive(Deserialize)]
// pub struct SessionInitRequest {
//     pub wallet: String,    // real wallet
//     pub signature: String, // signature to prove identity
//     pub expires: i64,      // expiry time (front-end chosen)
//     pub message: String,
// }

// #[derive(Serialize)]
// pub struct SessionInitResponse {
//     pub tx_base64: String,
//     pub session_authority_pda: String,
//     pub expires_at: i64,
// }

// pub async fn session_init(
//     State(app_state): State<Arc<AppState>>,
//     Json(req): Json<SessionInitRequest>,
// ) -> Result<Json<SessionInitResponse>, (StatusCode, String)> {
//     let wallet_pubkey_bytes = bs58::decode(&req.wallet)
//         .into_vec()
//         .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid wallet pubkey".to_string()))?;

//     let wallet_pubkey_bytes: [u8; 32] = wallet_pubkey_bytes.try_into().map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             "Pubkey must be 32 bytes".to_string(),
//         )
//     })?;

//     let verifying_key = VerifyingKey::from_bytes(&wallet_pubkey_bytes)
//         .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid verifying key".to_string()))?;

//     let signature_bytes = bs58::decode(&req.signature).into_vec().map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             "Invalid signature format".to_string(),
//         )
//     })?;

//     let signature = Signature::from_slice(&signature_bytes).map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             "Invalid signature bytes".to_string(),
//         )
//     })?;

//     verifying_key
//         .verify(req.message.as_bytes(), &signature)
//         .map_err(|_| {
//             (
//                 StatusCode::UNAUTHORIZED,
//                 "Signature verification failed".to_string(),
//             )
//         })?;

//     println!("🔐 Signature verified from wallet {}", req.wallet);

//     let wallet_pubkey = Pubkey::from_str(&req.wallet).map_err(|e| {
//         (
//             StatusCode::BAD_REQUEST,
//             format!("Invalid wallet pubkey: {}", e),
//         )
//     })?;

//     let session_keypair = read_keypair_from_file(
//         &std::env::var("SOLANA_SESSION_KEY_KEYPAIR_PATH")
//             .expect("Missing SOLANA_SESSION_KEY_KEYPAIR_PATH"),
//     )
//     .map_err(|e| {
//         (
//             StatusCode::INTERNAL_SERVER_ERROR,
//             format!("Failed to read session keypair: {}", e),
//         )
//     })?;

//     let session_key = session_keypair.pubkey();
//     let program = app_state.solana_service.opinions_market_program();
//     let program_id = program.id();

//     let (session_authority_pda, _bump) = Pubkey::find_program_address(
//         &[
//             SESSION_AUTHORITY_SEED,
//             wallet_pubkey.as_ref(),
//             session_key.as_ref(),
//         ],
//         &program_id,
//     );

//     let expires_at = req.expires;

//     let ixs = program
//         .request()
//         .accounts(opinions_market::accounts::RegisterSessionKey {
//             user: wallet_pubkey,
//             session_authority: session_authority_pda,
//             system_program: solana_sdk::system_program::ID,
//         })
//         .args(opinions_market::instruction::RegisterSessionKey {
//             session_key,
//             expires_at,
//             privileges_hash: [0u8; 32],
//         })
//         .instructions()
//         .map_err(|e| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 format!("Failed to build instruction: {}", e),
//             )
//         })?;

//     let tx = app_state
//         .solana_service
//         .build_partial_signed_tx(ixs)
//         .await
//         .map_err(|e| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 format!("Failed to build transaction: {}", e),
//             )
//         })?;

//     let tx_bytes = bincode::serialize(&tx).map_err(|e| {
//         (
//             StatusCode::INTERNAL_SERVER_ERROR,
//             format!("Failed to serialize transaction: {}", e),
//         )
//     })?;

//     let tx_base64 = general_purpose::STANDARD.encode(&tx_bytes);

//     Ok(Json(SessionInitResponse {
//         tx_base64,
//         session_authority_pda: session_authority_pda.to_string(),
//         expires_at,
//     }))
// }

// #[derive(Deserialize)]
// pub struct SessionSubmitRequest {
//     pub transaction: String, // Base64 encoded user-signed transaction
// }

// #[derive(Serialize)]
// pub struct SessionSubmitResponse {
//     pub signature: String, // Transaction signature
// }

// /// Receive user-signed session registration transaction and broadcast
// pub async fn session_submit(
//     State(app_state): State<Arc<AppState>>,
//     Json(req): Json<SessionSubmitRequest>,
// ) -> Result<Json<SessionSubmitResponse>, (StatusCode, String)> {
//     let signature = app_state
//         .solana_service
//         .submit_user_signed_tx(req.transaction)
//         .await
//         .map_err(|e| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 format!("Failed to submit transaction: {}", e),
//             )
//         })?;

//     Ok(Json(SessionSubmitResponse {
//         signature: signature.to_string(),
//     }))
// }
