use async_graphql::Result;
use mongodb::{
    Collection, Database,
    bson::{doc, oid::ObjectId},
};

use crate::models::user::User;

/// Service for user-related database operations
#[derive(Clone)]
pub struct UserService {
    db: Database,
}

impl UserService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get the users collection
    fn user_collection(&self) -> Collection<User> {
        self.db.collection(User::COLLECTION_NAME)
    }
}

impl UserService {
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

    /// Check if user exists by supabase_id, username, or email
    pub async fn user_exists(
        &self,
        supabase_id: &str,
        username: &str,
        email: &str,
    ) -> Result<bool> {
        let collection = self.user_collection();
        let existing = collection
            .find_one(doc! {
                "$or": [
                    {"supabase_id": supabase_id},
                    {"username": username},
                    {"email": email}
                ]
            })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
        Ok(existing.is_some())
    }

    /// Create a new user with validation
    pub async fn create_user_with_validation(
        &self,
        supabase_id: String,
        username: String,
        display_name: String,
        email: String,
        avatar_url: Option<String>,
        bio: Option<String>,
    ) -> Result<User> {
        // Check if user already exists
        if self.user_exists(&supabase_id, &username, &email).await? {
            return Err(async_graphql::Error::new(
                "User with this supabase_id, username, or email already exists",
            ));
        }

        let now = mongodb::bson::DateTime::now();
        let user_id = ObjectId::new();

        let user = User {
            id: Some(user_id),
            supabase_id,
            username,
            display_name,
            email,
            avatar_url,
            bio,
            created_at: now,
        };

        self.create_user(user).await
    }

    /// Create a new user (no validation)
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
