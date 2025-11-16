use async_graphql::{Context, InputObject, Object, Result, SimpleObject};

use std::sync::Arc;

use crate::{app_state::AppState, graphql::user::types::UserNode};

// ============================================================================
// UserMutation Object
// ============================================================================

#[derive(Default)]
pub struct UserMutation;

#[Object]
impl UserMutation {
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
pub struct UserCreatePayload {
    pub user: UserNode,
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

/// Create a new user
pub async fn user_create_resolver(
    ctx: &Context<'_>,
    input: UserCreateInput,
) -> Result<UserCreatePayload> {
    let app_state = ctx.data::<Arc<AppState>>()?;

    let user = app_state
        .mongo_service
        .users
        .create_user_with_validation(
            input.supabase_id,
            input.username,
            input.display_name,
            input.email,
            input.avatar_url,
            input.bio,
        )
        .await?;

    Ok(UserCreatePayload {
        user: UserNode::from(user),
    })
}
