use async_graphql::{Context, ID, Object, Result};
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};

use std::sync::Arc;

use crate::app_state::AppState;
use crate::graphql::user::types::{DiscoverFilters, UserNode};
use crate::models::user::User;

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
    /// Fetch a single user by identifier with optional nested resources.
    async fn user(&self, ctx: &Context<'_>, id: ID) -> Result<Option<UserNode>> {
        user_resolver(ctx, id).await
    }

    /// Find user by Supabase ID
    async fn user_by_supabase_id(
        &self,
        ctx: &Context<'_>,
        supabase_id: String,
    ) -> Result<Option<UserNode>> {
        user_by_supabase_id_resolver(ctx, supabase_id).await
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

/// Fetch a single user by identifier with optional nested resources.
pub async fn user_resolver(ctx: &Context<'_>, id: ID) -> Result<Option<UserNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let object_id = parse_object_id(&id)?;
    let collection: Collection<User> = app_state.mongo_service.user_collection();

    let user = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(map_mongo_error)?;

    Ok(user.map(UserNode::from))
}

/// Find user by Supabase ID
pub async fn user_by_supabase_id_resolver(
    ctx: &Context<'_>,
    supabase_id: String,
) -> Result<Option<UserNode>> {
    let app_state = ctx.data::<Arc<AppState>>()?;
    let collection: Collection<User> = app_state.mongo_service.user_collection();

    let user = collection
        .find_one(doc! {"supabase_id": supabase_id})
        .await
        .map_err(map_mongo_error)?;

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
