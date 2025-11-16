use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use mongodb::{
    Collection,
    bson::{doc, oid::ObjectId},
};

use std::sync::Arc;

use crate::{app_state::AppState, graphql::user::types::UserNode, models::user::User};

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
    let user_collection: Collection<User> = app_state.mongo_service.user_collection();

    // Check if user already exists
    let existing_user = user_collection
        .find_one(doc! {
            "$or": [
                {"supabase_id": &input.supabase_id},
                {"username": &input.username},
                {"email": &input.email}
            ]
        })
        .await
        .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;

    if existing_user.is_some() {
        return Err(async_graphql::Error::new(
            "User with this supabase_id, username, or email already exists",
        ));
    }

    // Create user
    let now = mongodb::bson::DateTime::now();
    let user_id = ObjectId::new();

    let user = User {
        id: Some(user_id),
        supabase_id: input.supabase_id,
        username: input.username,
        display_name: input.display_name,
        email: input.email,
        avatar_url: input.avatar_url,
        bio: input.bio,
        created_at: now,
    };

    user_collection
        .insert_one(&user)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create user: {}", e)))?;

    Ok(UserCreatePayload {
        user: UserNode::from(user),
    })
}
