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

    /// Get a user by Privy ID (DID)
    pub async fn get_user_by_privy_id(&self, privy_id: &str) -> Result<Option<User>> {
        let collection = self.user_collection();
        let user = collection
            .find_one(doc! { "privy_id": privy_id })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get user: {}", e)))?;
        Ok(user)
    }

    /// Get a user by wallet address
    pub async fn get_user_by_wallet(&self, wallet: &str) -> Result<Option<User>> {
        let collection = self.user_collection();
        let user = collection
            .find_one(doc! { "wallet": wallet })
            .await
            .map_err(|e| {
                async_graphql::Error::new(format!("Failed to get user by wallet: {}", e))
            })?;
        Ok(user)
    }

    /// Check if user exists by privy_id or wallet
    pub async fn user_exists(&self, privy_id: &str, wallet: &str) -> Result<bool> {
        let collection = self.user_collection();
        let existing = collection
            .find_one(doc! {
                "$or": [
                    {"privy_id": privy_id},
                    {"wallet": wallet}
                ]
            })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
        Ok(existing.is_some())
    }

    /// Check if wallet is already in use
    pub async fn wallet_exists(&self, wallet: &str) -> Result<bool> {
        let collection = self.user_collection();
        let existing = collection
            .find_one(doc! { "wallet": wallet })
            .await
            .map_err(|e| async_graphql::Error::new(format!("Database error: {}", e)))?;
        Ok(existing.is_some())
    }

    /// Create a new user with validation
    pub async fn create_user_with_validation(
        &self,
        privy_id: String,
        wallet: String,
        login_type: crate::models::user::LoginType,
        email: Option<String>,
    ) -> Result<User> {
        // Check if user already exists
        if self.user_exists(&privy_id, &wallet).await? {
            return Err(async_graphql::Error::new(
                "User with this privy_id or wallet already exists",
            ));
        }

        // Check if wallet is already in use
        if self.wallet_exists(&wallet).await? {
            return Err(async_graphql::Error::new(
                "Wallet address is already associated with another user",
            ));
        }

        // Enforce invariant: no email for Phantom users
        if login_type == crate::models::user::LoginType::PhantomExternal && email.is_some() {
            return Err(async_graphql::Error::new(
                "Phantom users cannot have an email address",
            ));
        }

        let now = mongodb::bson::DateTime::now();
        let user_id = ObjectId::new();

        let user = User {
            id: Some(user_id),
            privy_id,
            wallet,
            login_type,
            email,
            status: crate::models::user::UserStatus::Active,
            created_at: now,
        };

        self.create_user(user).await
    }

    /// Ensure unique indexes on privy_id and wallet
    pub async fn ensure_indexes(&self) -> Result<()> {
        let collection = self.user_collection();
        let indexes = vec![
            mongodb::IndexModel::builder()
                .keys(doc! { "privy_id": 1 })
                .options(
                    mongodb::options::IndexOptions::builder()
                        .unique(true)
                        .build(),
                )
                .build(),
            mongodb::IndexModel::builder()
                .keys(doc! { "wallet": 1 })
                .options(
                    mongodb::options::IndexOptions::builder()
                        .unique(true)
                        .build(),
                )
                .build(),
        ];
        collection
            .create_indexes(indexes)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create indexes: {}", e)))?;

        Ok(())
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
