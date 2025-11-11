use mongodb::Database;

/// Application state shared across all handlers
///
/// This struct holds all the services and dependencies needed by the application.
/// Using Arc allows thread-safe sharing across async tasks.
#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    // Future services can be added here:
    // pub cache: Arc<RedisClient>,
    // pub email: Arc<EmailService>,
    // pub s3: Arc<S3Service>,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
}
