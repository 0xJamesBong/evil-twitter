use async_graphql::{Context, ID, Object, Result, SimpleObject};
use axum::http::HeaderMap;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::user::mutations::SessionInfo;
use crate::graphql::user::types::UserNode;
use crate::models::user::User;
use crate::solana::get_session_authority_pda;
use crate::utils::auth;

// Helper functions
fn parse_object_id(id: &ID) -> Result<mongodb::bson::oid::ObjectId> {
    mongodb::bson::oid::ObjectId::parse_str(id.as_str())
        .map_err(|_| async_graphql::Error::new("Invalid ObjectId"))
}

fn map_mongo_error(err: mongodb::error::Error) -> async_graphql::Error {
    async_graphql::Error::new(err.to_string())
}

// ============================================================================
// UserQuery Object
// ============================================================================

#[derive(Default)]
pub struct UserQuery;

#[Object]
impl UserQuery {
    async fn me(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        me_resolver(ctx).await
    }
    /// Fetch a single user by identifier with optional nested resources.
    async fn user(&self, ctx: &Context<'_>, id: ID) -> Result<Option<UserNode>> {
        user_resolver(ctx, id).await
    }

    /// Find user by Privy ID (DID)
    async fn user_by_privy_id(
        &self,
        ctx: &Context<'_>,
        privy_id: String,
    ) -> Result<Option<UserNode>> {
        user_by_privy_id_resolver(ctx, privy_id).await
    }

    /// Find user by handle (username)
    async fn user_by_handle(
        &self,
        ctx: &Context<'_>,
        handle: String,
    ) -> Result<Option<UserNode>> {
        user_by_handle_resolver(ctx, handle).await
    }

    /// Flexible user search for discovery surfaces.
    async fn search_users(
        &self,
        ctx: &Context<'_>,
        query: String,
        #[graphql(default = 10)] limit: i32,
    ) -> Result<Vec<UserNode>> {
        search_users_resolver(ctx, query, limit).await
    }

    /// Curated discovery feed with optional filters and sorting.
    async fn discover_users(
        &self,
        ctx: &Context<'_>,
        filters: Option<crate::graphql::user::types::DiscoverFilters>,
    ) -> Result<Vec<UserNode>> {
        discover_users_resolver(ctx, filters).await
    }

    /// Get the complete message bytes ready to sign for session registration
    /// Returns base64-encoded message bytes: SESSION:{payer_pubkey}
    async fn session_message(&self, ctx: &Context<'_>) -> Result<String> {
        let app_state = ctx.data::<Arc<AppState>>()?;
        let session_key = app_state.solana_service.session_key_pubkey();
        let message = format!("SESSION:{}", session_key);
        // Return base64-encoded message bytes
        let message_bytes = message.as_bytes();
        Ok(STANDARD.encode(message_bytes))
    }

    /// Get canonical vote cost for the authenticated user
    /// Returns the cost in BLING lamports for voting on a "boring" post (0 votes)
    /// with no previous votes, using the user's actual social score.
    /// side: "Pump" or "Smack"
    async fn canonical_vote_cost(&self, ctx: &Context<'_>, side: String) -> Result<u64> {
        canonical_vote_cost_resolver(ctx, side).await
    }

    /// Get canonical vote costs in multiple tokens (BLING, USDC, Stablecoin)
    /// Returns costs in lamports for each token
    /// side: "Pump" or "Smack"
    async fn canonical_vote_costs(
        &self,
        ctx: &Context<'_>,
        side: String,
    ) -> Result<CanonicalVoteCosts> {
        canonical_vote_costs_resolver(ctx, side).await
    }

    /// Get the current session for the authenticated user
    /// Returns session information if a valid session exists on-chain
    async fn current_session(&self, ctx: &Context<'_>) -> Result<Option<SessionInfo>> {
        current_session_resolver(ctx).await
    }
}

// ============================================================================
// Query Resolvers (internal functions)
// ============================================================================
/// Get current authetnicated user from token
pub async fn me_resolver(ctx: &Context<'_>) -> Result<Option<UserNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Reuse the same helper as onboard_user
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;
    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?;
    Ok(user.map(UserNode::from))
}
/// Fetch a single user by identifier with optional nested resources.
pub async fn user_resolver(ctx: &Context<'_>, id: ID) -> Result<Option<UserNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let object_id = parse_object_id(&id)?;

    let user = app_state
        .mongo_service
        .users
        .get_user_by_id(object_id)
        .await?;

    Ok(user.map(UserNode::from))
}

/// Find user by Privy ID (DID)
pub async fn user_by_privy_id_resolver(
    ctx: &Context<'_>,
    privy_id: String,
) -> Result<Option<UserNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?;

    Ok(user.map(UserNode::from))
}

/// Find user by handle (username)
pub async fn user_by_handle_resolver(
    ctx: &Context<'_>,
    handle: String,
) -> Result<Option<UserNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    // Get profile by handle
    let profile = app_state
        .mongo_service
        .profiles
        .get_profile_by_handle(&handle)
        .await?;

    let Some(profile) = profile else {
        return Ok(None);
    };

    // Get user by user_id from profile
    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&profile.user_id)
        .await?;

    Ok(user.map(UserNode::from))
}

/// Flexible user search for discovery surfaces.
pub async fn search_users_resolver(
    ctx: &Context<'_>,
    query: String,
    limit: i32,
) -> Result<Vec<UserNode>> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let limit = limit.clamp(1, 50);
    let app_state = ctx.data::<Arc<AppState>>()?;
    let collection: Collection<User> = app_state.mongo_service.user_collection();

    let filter = doc! {
        "$or": [
            {"username": {"$regex": &query, "$options": "i"}},
            {"display_name": {"$regex": &query, "$options": "i"}}
        ]
    };

    let mut cursor = collection
        .find(filter)
        .sort(doc! {"followers_count": -1})
        .limit(i64::from(limit))
        .await
        .map_err(map_mongo_error)?;

    let mut results = Vec::new();
    while let Some(user) = cursor.try_next().await.map_err(map_mongo_error)? {
        results.push(UserNode::from(user));
    }

    Ok(results)
}

/// Curated discovery feed with optional filters and sorting.
pub async fn discover_users_resolver(
    ctx: &Context<'_>,
    filters: Option<crate::graphql::user::types::DiscoverFilters>,
) -> Result<Vec<UserNode>> {
    let filters = filters.unwrap_or_default();
    let app_state = ctx.data::<Arc<AppState>>()?;
    let user_collection: Collection<User> = app_state.mongo_service.user_collection();

    let mut filter_doc = doc! {};
    if let Some(min_followers) = filters.min_followers {
        filter_doc.insert("followers_count", doc! {"$gte": min_followers});
    }
    if let Some(min_tweets) = filters.min_tweets {
        filter_doc.insert("tweets_count", doc! {"$gte": min_tweets});
    }

    let sort_field = filters
        .sort_by
        .map(|sort| sort.field_name())
        .unwrap_or("followers_count");

    let limit = filters.limit.unwrap_or(10).clamp(1, 50);

    let mut cursor = user_collection
        .find(filter_doc)
        .sort(doc! {sort_field: -1})
        .limit(i64::from(limit))
        .await
        .map_err(map_mongo_error)?;

    let mut results = Vec::new();
    while let Some(user) = cursor.try_next().await.map_err(map_mongo_error)? {
        results.push(UserNode::from(user));
    }

    Ok(results)
}

/// Get canonical vote cost for the authenticated user
pub async fn canonical_vote_cost_resolver(ctx: &Context<'_>, side: String) -> Result<u64> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Get authenticated user
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found"))?;

    // Parse wallet pubkey
    let wallet_pubkey = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid wallet pubkey: {}", e)))?;

    // Parse side
    let vote_side = match side.as_str() {
        "Pump" => opinions_market::states::Side::Pump,
        "Smack" => opinions_market::states::Side::Smack,
        _ => {
            return Err(async_graphql::Error::new(
                "Invalid side: must be 'Pump' or 'Smack'",
            ));
        }
    };

    // Call SolanaService to get canonical cost (fetches UserAccount and computes using same logic as on-chain)
    let cost = app_state
        .solana_service
        .get_canonical_cost(&wallet_pubkey, vote_side)
        .await
        .map_err(|e| {
            eprintln!("canonical_cost error: {:?}", e);
            async_graphql::Error::new("Failed to compute canonical cost")
        })?;

    Ok(cost)
}

// ============================================================================
// Canonical Vote Costs
// ============================================================================

#[derive(SimpleObject)]
pub struct CanonicalVoteCosts {
    /// Cost in BLING lamports
    pub bling: u64,
    /// Cost in USDC lamports (None if USDC is not registered as valid payment)
    pub usdc: Option<u64>,
    /// Cost in Stablecoin lamports (None if Stablecoin is not registered as valid payment)
    pub stablecoin: Option<u64>,
}

/// Get canonical vote costs in multiple tokens
pub async fn canonical_vote_costs_resolver(
    ctx: &Context<'_>,
    side: String,
) -> Result<CanonicalVoteCosts> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Get authenticated user
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found"))?;

    // Parse wallet pubkey
    let wallet_pubkey = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid wallet pubkey: {}", e)))?;

    // Parse side
    let vote_side = match side.as_str() {
        "Pump" => opinions_market::states::Side::Pump,
        "Smack" => opinions_market::states::Side::Smack,
        _ => {
            return Err(async_graphql::Error::new(
                "Invalid side: must be 'Pump' or 'Smack'",
            ));
        }
    };

    // Get canonical cost in BLING

    let bling_cost = app_state
        .solana_service
        .get_canonical_cost(&wallet_pubkey, vote_side)
        .await
        .map_err(|e| {
            eprintln!("canonical_cost error: {:?}", e);
            async_graphql::Error::new("Failed to compute canonical cost")
        })?;

    // Get USDC and Stablecoin mints from environment or config
    // For now, we'll try to get them from environment variables or use defaults
    let usdc_mint_str = std::env::var("USDC_MINT").ok();
    let stablecoin_mint_str = std::env::var("STABLECOIN_MINT").ok();

    // Convert to USDC if available
    let usdc_cost = if let Some(ref usdc_mint_str) = usdc_mint_str {
        if let Ok(usdc_mint) = solana_sdk::pubkey::Pubkey::from_str(usdc_mint_str) {
            match app_state
                .solana_service
                .convert_bling_to_token(bling_cost, &usdc_mint)
                .await
            {
                Ok(cost) => Some(cost),
                Err(e) => {
                    eprintln!("Failed to convert to USDC: {}", e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    // Convert to Stablecoin if available
    let stablecoin_cost = if let Some(ref stablecoin_mint_str) = stablecoin_mint_str {
        if let Ok(stablecoin_mint) = solana_sdk::pubkey::Pubkey::from_str(stablecoin_mint_str) {
            match app_state
                .solana_service
                .convert_bling_to_token(bling_cost, &stablecoin_mint)
                .await
            {
                Ok(cost) => Some(cost),
                Err(e) => {
                    eprintln!("Failed to convert to Stablecoin: {}", e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok(CanonicalVoteCosts {
        bling: bling_cost,
        usdc: usdc_cost,
        stablecoin: stablecoin_cost,
    })
}

/// Get the current session for the authenticated user
pub async fn current_session_resolver(ctx: &Context<'_>) -> Result<Option<SessionInfo>> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let headers = ctx
        .data::<HeaderMap>()
        .map_err(|_| async_graphql::Error::new("Failed to get headers from context"))?;

    // Get authenticated user
    let privy_id = auth::get_privy_id_from_header(&app_state.privy_service, headers)
        .await
        .map_err(|(status, json)| {
            let error_msg = json
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Authentication failed");
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    let user = app_state
        .mongo_service
        .users
        .get_user_by_privy_id(&privy_id)
        .await?
        .ok_or_else(|| async_graphql::Error::new("User not found"))?;

    // Parse wallet pubkey
    let wallet_pubkey = solana_sdk::pubkey::Pubkey::from_str(&user.wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid wallet pubkey: {}", e)))?;

    // Get session authority from blockchain
    let session_authority = app_state
        .solana_service
        .get_session_authority(&wallet_pubkey)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to get session authority: {}", e))
        })?;

    match session_authority {
        Some(session) => {
            // Derive session authority PDA to return
            let program_id = app_state.solana_service.opinions_market_program().id();
            let session_key = app_state.solana_service.session_key_pubkey();
            let (session_authority_pda, _) =
                get_session_authority_pda(&program_id, &wallet_pubkey, &session_key);

            Ok(Some(SessionInfo {
                session_authority_pda: session_authority_pda.to_string(),
                session_key: session_key.to_string(),
                expires_at: session.expires_at,
                user_wallet: user.wallet,
            }))
        }
        None => Ok(None),
    }
}

// ============================================================================
// Vault Balances
// ============================================================================

#[derive(SimpleObject)]
pub struct VaultBalances {
    /// Vault balance in BLING lamports
    pub bling: u64,
    /// Vault balance in USDC lamports (None if USDC is not registered as valid payment)
    pub usdc: Option<u64>,
    /// Vault balance in Stablecoin lamports (None if Stablecoin is not registered as valid payment)
    pub stablecoin: Option<u64>,
}

/// Get vault balances for all valid payment tokens
pub async fn vault_balances_resolver(ctx: &Context<'_>, wallet: &str) -> Result<VaultBalances> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    // Parse user's Solana wallet
    let user_wallet = solana_sdk::pubkey::Pubkey::from_str(wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

    // Get BLING mint
    let bling_mint = *app_state.solana_service.get_bling_mint();

    // Get BLING vault balance
    let bling_balance = app_state
        .solana_service
        .get_user_vault_balance(&user_wallet, &bling_mint)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to get BLING vault balance: {}", e))
        })?;

    // Get USDC and Stablecoin mints from environment
    let usdc_mint_str = std::env::var("USDC_MINT").ok();
    let stablecoin_mint_str = std::env::var("STABLECOIN_MINT").ok();

    // Get USDC vault balance if available
    let usdc_balance = if let Some(ref usdc_mint_str) = usdc_mint_str {
        if let Ok(usdc_mint) = solana_sdk::pubkey::Pubkey::from_str(usdc_mint_str) {
            match app_state
                .solana_service
                .get_user_vault_balance(&user_wallet, &usdc_mint)
                .await
            {
                Ok(balance) => Some(balance),
                Err(e) => {
                    eprintln!("Failed to get USDC vault balance: {}", e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    // Get Stablecoin vault balance if available
    let stablecoin_balance = if let Some(ref stablecoin_mint_str) = stablecoin_mint_str {
        if let Ok(stablecoin_mint) = solana_sdk::pubkey::Pubkey::from_str(stablecoin_mint_str) {
            match app_state
                .solana_service
                .get_user_vault_balance(&user_wallet, &stablecoin_mint)
                .await
            {
                Ok(balance) => Some(balance),
                Err(e) => {
                    eprintln!("Failed to get Stablecoin vault balance: {}", e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok(VaultBalances {
        bling: bling_balance,
        usdc: usdc_balance,
        stablecoin: stablecoin_balance,
    })
}

#[derive(SimpleObject)]
pub struct TipVaultBalances {
    pub bling: u64,
    pub usdc: Option<u64>,
    pub stablecoin: Option<u64>,
}

/// Get tip vault balances for all valid payment tokens
pub async fn tip_vault_balances_resolver(ctx: &Context<'_>, wallet: &str) -> Result<TipVaultBalances> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    // Parse user's Solana wallet
    let user_wallet = solana_sdk::pubkey::Pubkey::from_str(wallet)
        .map_err(|e| async_graphql::Error::new(format!("Invalid user wallet: {}", e)))?;

    // Get BLING mint
    let bling_mint = *app_state.solana_service.get_bling_mint();

    // Get BLING tip vault balance
    let bling_balance = app_state
        .solana_service
        .get_tip_vault_balance(&user_wallet, &bling_mint)
        .await
        .map_err(|e| {
            async_graphql::Error::new(format!("Failed to get BLING tip vault balance: {}", e))
        })?;

    // Get USDC and Stablecoin mints from environment
    let usdc_mint_str = std::env::var("USDC_MINT").ok();
    let stablecoin_mint_str = std::env::var("STABLECOIN_MINT").ok();

    // Get USDC tip vault balance if available
    let usdc_balance = if let Some(ref usdc_mint_str) = usdc_mint_str {
        if let Ok(usdc_mint) = solana_sdk::pubkey::Pubkey::from_str(usdc_mint_str) {
            match app_state
                .solana_service
                .get_tip_vault_balance(&user_wallet, &usdc_mint)
                .await
            {
                Ok(balance) => Some(balance),
                Err(e) => {
                    eprintln!("Failed to get USDC tip vault balance: {}", e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    // Get Stablecoin tip vault balance if available
    let stablecoin_balance = if let Some(ref stablecoin_mint_str) = stablecoin_mint_str {
        if let Ok(stablecoin_mint) = solana_sdk::pubkey::Pubkey::from_str(stablecoin_mint_str) {
            match app_state
                .solana_service
                .get_tip_vault_balance(&user_wallet, &stablecoin_mint)
                .await
            {
                Ok(balance) => Some(balance),
                Err(e) => {
                    eprintln!("Failed to get Stablecoin tip vault balance: {}", e);
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok(TipVaultBalances {
        bling: bling_balance,
        usdc: usdc_balance,
        stablecoin: stablecoin_balance,
    })
}
