use async_graphql::{Context, ID, Object, Result};
use axum::http::HeaderMap;
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};

use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::user::types::UserNode;
use crate::models::user::User;
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
