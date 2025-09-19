use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use mongodb::{bson::doc, Collection, Database};
use utoipa::ToSchema;

use crate::models::user::User;

#[derive(Debug, serde::Serialize, ToSchema)]
pub struct TestResponse {
    pub message: String,
    pub db_connected: bool,
}

/// Test database connection
#[utoipa::path(
    get,
    path = "/test/db",
    responses(
        (status = 200, description = "Database test result", body = TestResponse)
    ),
    tag = "test"
)]
pub async fn test_db_connection(
    State(db): State<Database>,
) -> Result<Json<TestResponse>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<User> = db.collection("users");
    
    match collection.count_documents(doc! {}, None).await {
        Ok(count) => Ok(Json(TestResponse {
            message: format!("Database connected successfully. Users count: {}", count),
            db_connected: true,
        })),
        Err(e) => {
            eprintln!("Database error: {:?}", e);
            Ok(Json(TestResponse {
                message: format!("Database error: {}", e),
                db_connected: false,
            }))
        }
    }
}
