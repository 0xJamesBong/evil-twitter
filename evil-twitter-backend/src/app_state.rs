use std::sync::Arc;

use mongodb::{Client, Database};

use crate::services::mongo_service::MongoService;

/// Application state shared across all handlers
///
/// This struct holds all the services and dependencies needed by the application.
/// Using Arc allows thread-safe sharing across async tasks.
///
/// Services encapsulate all database operations - no direct database access.
#[derive(Clone)]
pub struct AppState {
    /// Services - all database operations go through services
    pub mongo_service: Arc<MongoService>,
    // pub cache: Arc<RedisClient>,
    // pub email: Arc<EmailService>,
    // pub s3: Arc<S3Service>,
}

impl AppState {
    pub fn new(client: Client, db: Database) -> Self {
        Self {
            mongo_service: Arc::new(MongoService::new(client.clone(), db.clone())),
        }
    }
}
