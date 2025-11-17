use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use axum::http::HeaderMap;

use std::sync::Arc;

use crate::{app_state::AppState, graphql::user::types::UserNode, utils::auth};

// ============================================================================
// UserMutation Object
// ============================================================================

#[derive(Default)]
pub struct UserMutation;

#[Object]
impl UserMutation {
    /// Onboard a new user after Privy authentication
    /// This mutation:
    /// 1. Verifies the Privy access token from headers
    /// 2. Fetches user data from Privy
    /// 3. Determines login type (email_embedded vs phantom_external)
    /// 4. Extracts wallet address
    /// 5. Creates/updates User and Profile records
    async fn onboard_user(
        &self,
        ctx: &Context<'_>,
        input: OnboardUserInput,
    ) -> Result<OnboardUserPayload> {
        onboard_user_resolver(ctx, input).await
    }

    /// Placeholder mutation - user mutations will be added here as needed
    async fn _placeholder(&self) -> String {
        "placeholder".to_string()
    }

    ///
    async fn user_create(
        &self,
        ctx: &Context<'_>,
        input: UserCreateInput,
    ) -> Result<UserCreatePayload> {
        user_create_resolver(ctx, input).await
    }
}

// ============================================================================
// Input Types
// ============================================================================

#[derive(InputObject)]
pub struct OnboardUserInput {
    pub handle: String,
    pub display_name: String,
}

#[derive(InputObject)]
pub struct UserCreateInput {
    pub supabase_id: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}

// ============================================================================
// Payload Types
// ============================================================================

#[derive(SimpleObject)]
pub struct OnboardUserPayload {
    pub user: UserNode,
}

#[derive(SimpleObject)]
pub struct UserCreatePayload {
    pub user: UserNode,
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

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
            async_graphql::Error::new(format!("{} (status {})", error_msg, status))
        })?;

    // Fetch full user data from Privy
    let privy_user = app_state
        .privy_service
        .get_user_by_id(&privy_id)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch Privy user: {}", e)))?;

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

        // Check if handle is taken
        if app_state
            .mongo_service
            .profiles
            .handle_exists(&input.handle)
            .await?
        {
            return Err(async_graphql::Error::new("Handle is already taken"));
        }

        // Create new user
        let user = app_state
            .mongo_service
            .users
            .create_user_with_validation(privy_id, wallet, login_type, email)
            .await?;

        // Create profile
        let profile = crate::models::profile::Profile {
            id: Some(mongodb::bson::oid::ObjectId::new()),
            user_id: user.privy_id.clone(),
            handle: input.handle,
            display_name: input.display_name,
            avatar_url: None,
            bio: None,
            status: crate::models::profile::ProfileStatus::Active,
            created_at: mongodb::bson::DateTime::now(),
        };

        app_state
            .mongo_service
            .profiles
            .create_profile(profile)
            .await?;

        user
    };

    Ok(OnboardUserPayload {
        user: UserNode::from(user),
    })
}

/// Create a new user (legacy - kept for backward compatibility)
pub async fn user_create_resolver(
    _ctx: &Context<'_>,
    _input: UserCreateInput,
) -> Result<UserCreatePayload> {
    // This is legacy code - should be deprecated
    // For now, return an error suggesting to use onboard_user instead
    Err(async_graphql::Error::new(
        "This mutation is deprecated. Please use onboardUser instead.",
    ))
}
