use async_graphql::Result;
use mongodb::{Collection, Database, bson::doc};

use crate::models::profile::Profile;

/// Service for profile-related database operations
#[derive(Clone)]
pub struct ProfileService {
    db: Database,
}

impl ProfileService {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get the profiles collection
    fn profile_collection(&self) -> Collection<Profile> {
        self.db.collection(Profile::COLLECTION_NAME)
    }

    /// Get a profile by user ID (Privy DID)
    pub async fn get_profile_by_user_id(&self, user_id: &str) -> Result<Option<Profile>> {
        let collection = self.profile_collection();
        let profile = collection
            .find_one(doc! { "user_id": user_id })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get profile: {}", e)))?;
        Ok(profile)
    }

    /// Get a profile by handle
    pub async fn get_profile_by_handle(&self, handle: &str) -> Result<Option<Profile>> {
        let collection = self.profile_collection();
        let profile = collection
            .find_one(doc! { "handle": handle })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get profile: {}", e)))?;
        Ok(profile)
    }

    /// Check if handle is taken
    pub async fn handle_exists(&self, handle: &str) -> Result<bool> {
        let collection = self.profile_collection();
        let existing = collection
            .find_one(doc! { "handle": handle })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
        Ok(existing.is_some())
    }

    /// Create a new profile
    pub async fn create_profile(&self, profile: Profile) -> Result<Profile> {
        let collection = self.profile_collection();
        collection
            .insert_one(&profile)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create profile: {}", e)))?;
        Ok(profile)
    }

    /// Update a profile
    pub async fn update_profile(&self, profile: &Profile) -> Result<()> {
        let collection = self.profile_collection();
        let id = profile
            .id
            .ok_or_else(|| async_graphql::Error::new("Profile ID is required"))?;
        collection
            .replace_one(doc! { "_id": id }, profile)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update profile: {}", e)))?;
        Ok(())
    }

    /// Ensure unique index on handle
    pub async fn ensure_indexes(&self) -> Result<()> {
        let collection = self.profile_collection();
        let indexes = vec![
            mongodb::IndexModel::builder()
                .keys(doc! { "handle": 1 })
                .options(
                    mongodb::options::IndexOptions::builder()
                        .unique(true)
                        .build(),
                )
                .build(),
            mongodb::IndexModel::builder()
                .keys(doc! { "user_id": 1 })
                .build(),
        ];
        collection
            .create_indexes(indexes)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create indexes: {}", e)))?;

        Ok(())
    }
}
