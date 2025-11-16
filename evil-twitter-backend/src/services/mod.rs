// Services module - provides business logic layer above database access
pub mod mongo_service;

// Re-export commonly used services
pub use mongo_service::*;
