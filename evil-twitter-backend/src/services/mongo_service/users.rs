use async_graphql::Result;
use mongodb::bson::{doc, oid::ObjectId};

use crate::models::user::User;

impl super::MongoService {
    /// Get a user by ID
    pub async fn get_user_by_id(&self, id: ObjectId) -> Result<Option<User>> {
        let collection = self.user_collection();
        let user = collection
            .find_one(doc! { "_id": id })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get user: {}", e)))?;
        Ok(user)
    }

    /// Get a user by supabase_id
    pub async fn get_user_by_supabase_id(&self, supabase_id: &str) -> Result<Option<User>> {
        let collection = self.user_collection();
        let user = collection
            .find_one(doc! { "supabase_id": supabase_id })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get user: {}", e)))?;
        Ok(user)
    }

    /// Create a new user
    pub async fn create_user(&self, user: User) -> Result<User> {
        let collection = self.user_collection();
        collection
            .insert_one(&user)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create user: {}", e)))?;
        Ok(user)
    }

    /// Update user
    pub async fn update_user(&self, user: &User) -> Result<()> {
        let collection = self.user_collection();
        let id = user
            .id
            .ok_or_else(|| async_graphql::Error::new("User ID is required"))?;
        collection
            .replace_one(doc! { "_id": id }, user)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update user: {}", e)))?;
        Ok(())
    }
}
