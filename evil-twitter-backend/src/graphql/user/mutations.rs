use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use axum::http::HeaderMap;

use std::str::FromStr;
use std::sync::Arc;

use base64::{Engine as _, engine::general_purpose};
use solana_sdk::pubkey::Pubkey;

use crate::solana::get_session_authority_pda;
use crate::{app_state::AppState, graphql::user::types::UserNode, utils::auth};

// ============================================================================
// UserMutation Object
// ============================================================================

#[derive(InputObject)]
pub struct RegisterSessionInput {
    // Backend generates session key (payer pubkey), so only signature is needed
    pub session_signature: String,
}

#[derive(SimpleObject)]
pub struct RegisterSessionPayload {
    pub session: SessionInfo,
}

#[derive(Default)]
pub struct UserMutation;

#[Object]
impl UserMutation {
    async fn onboard_user(
        &self,
        ctx: &Context<'_>,
        input: OnboardUserInput,
    ) -> Result<OnboardUserPayload> {
        onboard_user_resolver(ctx, input).await
    }

    /// Explicit on-chain user creation (rarely used; mostly for ops)
    async fn create_onchain_user(&self, ctx: &Context<'_>) -> Result<UserCreatePayload> {
        create_onchain_user_resolver(ctx).await
    }

    /// Renew or register a delegated session
    async fn register_session(
        &self,
        ctx: &Context<'_>,
        input: RegisterSessionInput,
    ) -> Result<RegisterSessionPayload> {
        register_session_resolver(ctx, input).await
    }

    /// Update user profile (handle, displayName, bio, avatarUrl)
    async fn update_profile(
        &self,
        ctx: &Context<'_>,
        input: UpdateProfileInput,
    ) -> Result<UserNode> {
        update_profile_resolver(ctx, input).await
    }
}

// ============================================================================
// Input Types
// ============================================================================

#[derive(InputObject)]
pub struct OnboardUserInput {
    // Session registration - backend generates session key (payer pubkey)
    pub session_signature: String, // base58/base64/hex-encoded 64 bytes signature
}

#[derive(InputObject)]
pub struct UpdateProfileInput {
    pub handle: String,
    pub display_name: String,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

// ============================================================================
// Payload Types
// ============================================================================

#[derive(SimpleObject)]
pub struct SessionInfo {
    pub session_authority_pda: String,
    pub session_key: String,
    pub expires_at: i64,
    pub user_wallet: String,
}

#[derive(SimpleObject)]
pub struct OnboardUserPayload {
    pub user: UserNode,
    pub session: Option<SessionInfo>, // None if session registration fails or is skipped
}

#[derive(SimpleObject)]
pub struct UserCreatePayload {
    pub user: UserNode,
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

/// Parse signature from base58, base64, or hex format into bytes
/// Note: This is format conversion only - verification happens on-chain
fn parse_signature_bytes(signature_str: &str) -> Result<[u8; 64]> {
    // Try base58 first (most common for Solana)
    if let Ok(bytes) = bs58::decode(signature_str).into_vec() {
        if bytes.len() == 64 {
            return Ok(bytes.try_into().unwrap());
        }
    }

    // Try base64
    if let Ok(bytes) = general_purpose::STANDARD.decode(signature_str) {
        if bytes.len() == 64 {
            return Ok(bytes.try_into().unwrap());
        }
    }

    // Try hex
    if let Ok(bytes) = hex::decode(signature_str) {
        if bytes.len() == 64 {
            return Ok(bytes.try_into().unwrap());
        }
    }

    Err(async_graphql::Error::new(
        "Invalid signature format: must be 64 bytes in base58, base64, or hex",
    ))
}

/// Onboard a new user after Privy authentication
pub async fn onboard_user_resolver(
    ctx: &Context<'_>,
    input: OnboardUserInput,
) -> Result<OnboardUserPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Verify Privy token and get Privy ID
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            eprintln!(
                "onboard_user: Token verification failed: {} (status {})",
                error_msg, status
            );
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    eprintln!("onboard_user: Verified Privy ID: {}", privy_id);

    // Extract identity token from headers (supports both privy-id-token and Authorization Bearer)
    let id_token = if let Some(id_token_header) = headers.get("privy-id-token") {
        id_token_header
            .to_str()
            .map_err(|_| async_graphql::Error::new("Invalid privy-id-token header"))?
            .to_string()
    } else if let Some(auth_header) = headers.get("authorization") {
        let auth_str = auth_header
            .to_str()
            .map_err(|_| async_graphql::Error::new("Invalid authorization header"))?;
        auth_str
            .strip_prefix("Bearer ")
            .ok_or_else(|| async_graphql::Error::new("Authorization header is not Bearer"))?
            .to_string()
    } else {
        return Err(async_graphql::Error::new(
            "Missing identity token: provide either privy-id-token header or Authorization Bearer header",
        ));
    };

    // Parse user data from identity token (no API call needed!)
    let privy_user = app_state
        .privy_service
        .parse_user_from_identity_token(&id_token)
        .map_err(|e| {
            eprintln!("onboard_user: Failed to parse identity token: {}", e);
            async_graphql::Error::new(format!("Failed to parse identity token: {}", e))
        })?;

    eprintln!(
        "onboard_user: Parsed user from identity token, email: {:?}, wallets: {}",
        privy_user.email.as_ref().map(|e| &e.address),
        privy_user.wallets.len()
    );

    // Determine login type
    let login_type = app_state
        .privy_service
        .determine_login_type(&privy_user)
        .map_err(|e| async_graphql::Error::new(format!("Failed to determine login type: {}", e)))?;

    // Extract Solana wallet address
    let wallet = app_state
        .privy_service
        .extract_solana_wallet(&privy_user)
        .map_err(|e| async_graphql::Error::new(format!("No Solana wallet found: {}", e)))?;

    // Extract email (only for email_embedded users)
    let email = match login_type {
        crate::models::user::LoginType::EmailEmbedded => privy_user.email.map(|e| e.address),
        crate::models::user::LoginType::PhantomExternal => None,
    };

    // Check if user already exists
    let existing_user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?;

    let user = if let Some(mut user) = existing_user {
        // User exists - ensure invariants are maintained
        // Don't allow changing login_type or wallet
        if user.login_type != login_type {
            return Err(async_graphql::Error::new(
                "Cannot change login type for existing user",
            ));
        }
        if user.wallet != wallet {
            return Err(async_graphql::Error::new(
                "Cannot change wallet for existing user",
            ));
        }
        // Update email if needed (only for email_embedded users)
        if login_type == crate::models::user::LoginType::EmailEmbedded {
            user.email = email;
        }
        app_state.mongo_service.users.update_user(&user).await?;
        user
    } else {
        // Check if wallet is already in use
        if app_state.mongo_service.users.wallet_exists(&wallet).await? {
            return Err(async_graphql::Error::new(
                "Wallet address is already associated with another user",
            ));
        }

        // Create new user (profile will be created separately via updateProfile mutation)
        eprintln!(
            "onboard_user: Creating new user with privy_id: {}, wallet: {}, login_type: {:?}",
            privy_id, wallet, login_type
        );
        let user = app_state
            .mongo_service
            .users
            .create_user_with_validation(
                privy_id.clone(),
                wallet.clone(),
                login_type,
                email.clone(),
            )
            .await
            .map_err(|e| {
                eprintln!("onboard_user: Failed to create user: {:?}", e);
                e
            })?;

        eprintln!(
            "onboard_user: User created successfully with ID: {:?}",
            user.id
        );

        user
    };

    // Parse wallet pubkey
    let wallet_pubkey = Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid wallet pubkey: {}", e)))?;

    // Ensure on-chain user exists
    let onchain_user = app_state
        .solana_service
        .get_user_account(&wallet_pubkey)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to check on-chain user: {}", e)))?;

    if onchain_user.is_none() {
        eprintln!("onboard_user: On-chain user does not exist, creating...");
        app_state
            .solana_service
            .create_user(wallet_pubkey)
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!("Failed to create on-chain user: {}", e))
            })?;
        eprintln!("onboard_user: On-chain user created successfully");
    }

    // Register session - backend generates session key (payer pubkey)
    // The session key is the backend's payer pubkey
    let session_key = app_state.solana_service.payer_pubkey();

    // Construct the message that should have been signed: SESSION:{session_key}
    let message = format!("SESSION:{}", session_key);
    let message_bytes = message.as_bytes().to_vec();

    let signature_bytes = parse_signature_bytes(&input.session_signature)?;

    eprintln!("onboard_user: Registering session...");
    app_state
        .solana_service
        .register_session(wallet_pubkey, session_key, signature_bytes, message_bytes)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to register session: {}", e)))?;

    // Derive session authority PDA and calculate expires_at
    let program_id = app_state.solana_service.opinions_market_program().id();
    let (session_authority_pda, _) =
        get_session_authority_pda(&program_id, &wallet_pubkey, &session_key);
    let expires_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        + (60 * 60 * 24 * 30); // 30 days

    let session_info = SessionInfo {
        session_authority_pda: session_authority_pda.to_string(),
        session_key: session_key.to_string(),
        expires_at,
        user_wallet: user.wallet.clone(),
    };

    Ok(OnboardUserPayload {
        user: UserNode::from(user),
        session: Some(session_info),
    })
}

/// Create on-chain user account (ops/debug only)
pub async fn create_onchain_user_resolver(ctx: &Context<'_>) -> Result<UserCreatePayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Verify Privy token and get Privy ID
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    // Get user from Mongo
    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found in database"))?;

    // Parse wallet pubkey
    let wallet_pubkey = Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid wallet pubkey: {}", e)))?;

    // Check if on-chain user already exists
    let onchain_user = app_state
        .solana_service
        .get_user_account(&wallet_pubkey)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to check on-chain user: {}", e)))?;

    if onchain_user.is_some() {
        return Err(async_graphql::Error::new("On-chain user already exists"));
    }

    // Create on-chain user
    app_state
        .solana_service
        .create_user(wallet_pubkey)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create on-chain user: {}", e)))?;

    Ok(UserCreatePayload {
        user: UserNode::from(user),
    })
}

/// Register or renew a session for a user
pub async fn register_session_resolver(
    ctx: &Context<'_>,
    input: RegisterSessionInput,
) -> Result<RegisterSessionPayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Verify Privy token and get Privy ID
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    // Get user from Mongo
    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found in database"))?;

    // Parse wallet pubkey
    let wallet_pubkey = Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid wallet pubkey: {}", e)))?;

    // Backend generates session key (payer pubkey)
    let session_key = app_state.solana_service.payer_pubkey();

    // Construct the message that should have been signed: SESSION:{session_key}
    let message = format!("SESSION:{}", session_key);
    let message_bytes = message.as_bytes().to_vec();

    // Parse signature (format conversion only - verification happens on-chain)
    let signature_bytes = parse_signature_bytes(&input.session_signature)?;

    // Register session on-chain (SolanaService creates ed25519 instruction, program verifies)
    app_state
        .solana_service
        .register_session(wallet_pubkey, session_key, signature_bytes, message_bytes)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to register session: {}", e)))?;

    // Derive session authority PDA and calculate expires_at
    let program_id = app_state.solana_service.opinions_market_program().id();
    let (session_authority_pda, _) =
        get_session_authority_pda(&program_id, &wallet_pubkey, &session_key);
    let expires_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        + (60 * 60 * 24 * 30); // 30 days

    Ok(RegisterSessionPayload {
        session: SessionInfo {
            session_authority_pda: session_authority_pda.to_string(),
            session_key: session_key.to_string(),
            expires_at,
            user_wallet: user.wallet,
        },
    })
}

/// Update user profile (handle, displayName, bio, avatarUrl)
pub async fn update_profile_resolver(
    ctx: &Context<'_>,
    input: UpdateProfileInput,
) -> Result<UserNode> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Verify Privy token and get Privy ID
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    // Get user from Mongo
    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found in database"))?;

    // Check if handle is taken by another user
    let existing_profile = app_state
        .mongo_service
        .profiles
        .get_profile_by_user_id(&privy_id)
        .await?;

    if let Some(existing) = &existing_profile {
        // Check if handle is being changed and if new handle is taken
        if existing.handle != input.handle {
            if app_state
                .mongo_service
                .profiles
                .handle_exists(&input.handle)
                .await?
            {
                return Err(async_graphql::Error::new("Handle is already taken"));
            }
        }

        // Update existing profile
        let mut updated_profile = existing.clone();
        updated_profile.handle = input.handle.clone();
        updated_profile.display_name = input.display_name.clone();
        updated_profile.bio = input.bio.clone();
        updated_profile.avatar_url = input.avatar_url.clone();

        app_state
            .mongo_service
            .profiles
            .update_profile(&updated_profile)
            .await?;

        eprintln!(
            "update_profile: Profile updated with handle: {}, display_name: {}",
            input.handle, input.display_name
        );
    } else {
        // Create new profile
        let profile = crate::models::profile::Profile {
            id: Some(mongodb::bson::oid::ObjectId::new()),
            user_id: user.privy_id.clone(),
            handle: input.handle.clone(),
            display_name: input.display_name.clone(),
            avatar_url: input.avatar_url.clone(),
            bio: input.bio.clone(),
            status: crate::models::profile::ProfileStatus::Active,
            created_at: mongodb::bson::DateTime::now(),
        };

        // Check if handle is taken
        if app_state
            .mongo_service
            .profiles
            .handle_exists(&input.handle)
            .await?
        {
            return Err(async_graphql::Error::new("Handle is already taken"));
        }

        app_state
            .mongo_service
            .profiles
            .create_profile(profile)
            .await?;

        eprintln!(
            "update_profile: Profile created with handle: {}, display_name: {}",
            input.handle, input.display_name
        );
    }

    // Fetch updated user with profile
    let updated_user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found after profile update"))?;

    Ok(UserNode::from(updated_user))
}
