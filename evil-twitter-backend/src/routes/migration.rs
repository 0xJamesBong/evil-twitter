use axum::{Json, extract::State, http::StatusCode};
use mongodb::{Collection, Database, bson::doc};
use utoipa::ToSchema;

use crate::models::tweet::Tweet;

#[derive(utoipa::ToSchema)]
pub struct MigrationResponse {
    pub message: String,
    pub modified_count: u64,
    pub matched_count: u64,
}

/// Migration endpoint to add health field to existing tweets
#[utoipa::path(
    post,
    path = "/admin/migrate-health",
    responses(
        (status = 200, description = "Migration completed successfully", body = MigrationResponse),
        (status = 500, description = "Database error during migration")
    ),
    tag = "admin"
)]
pub async fn migrate_tweets_health(
    State(db): State<Database>,
) -> Result<(StatusCode, Json<MigrationResponse>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Tweet> = db.collection("tweets");

    // Update all tweets that don't have a health field to have health: 100
    let result = collection
        .update_many(
            doc! { "health": { "$exists": false } },
            doc! { "$set": { "health": 100 } },
        )
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error during migration"})),
            )
        })?;

    Ok((
        StatusCode::OK,
        Json(MigrationResponse {
            message: "Migration completed successfully".to_string(),
            modified_count: result.modified_count,
            matched_count: result.matched_count,
        }),
    ))
}
