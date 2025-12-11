use mongodb::{Client, Collection, Database};

use crate::models::{follow::Follow, like::Like, profile::Profile, tip::TipRecord, tweet::Tweet, user::User};

// MongoDB service modules
pub mod profiles;
pub mod tweets;
pub mod users;

use profiles::ProfileService;
use tweets::TweetService;
use users::UserService;

/// Unified MongoDB service for all database operations
#[derive(Clone)]
pub struct MongoService {
    client: Client,
    db: Database,
    /// Tweet-related database operations
    pub tweets: TweetService,
    /// User-related database operations
    pub users: UserService,
    /// Profile-related database operations
    pub profiles: ProfileService,
}

impl MongoService {
    pub fn new(client: Client, db: Database) -> Self {
        let tweet_service = TweetService::new(db.clone());
        let user_service = UserService::new(db.clone());
        let profile_service = ProfileService::new(db.clone());
        Self {
            client,
            db,
            tweets: tweet_service,
            users: user_service,
            profiles: profile_service,
        }
    }

    /// Get the database (for utility functions that need it)
    pub fn db(&self) -> &Database {
        &self.db
    }

    // ============================================================================
    // Collection Getters - organized by collection name
    // ============================================================================

    /// Get the tweets collection
    pub fn tweet_collection(&self) -> Collection<Tweet> {
        self.db.collection(Tweet::COLLECTION_NAME)
    }

    /// Get the users collection
    pub fn user_collection(&self) -> Collection<User> {
        self.db.collection(User::COLLECTION_NAME)
    }

    /// Get the likes collection
    pub fn like_collection(&self) -> Collection<Like> {
        self.db.collection(Like::COLLECTION_NAME)
    }

    /// Get the follows collection
    pub fn follow_collection(&self) -> Collection<Follow> {
        self.db.collection(Follow::COLLECTION_NAME)
    }

    /// Get the profiles collection
    pub fn profile_collection(&self) -> Collection<Profile> {
        self.db.collection(Profile::COLLECTION_NAME)
    }

    /// Get the tip records collection
    pub fn tip_collection(&self) -> Collection<TipRecord> {
        self.db.collection(TipRecord::COLLECTION_NAME)
    }
}
