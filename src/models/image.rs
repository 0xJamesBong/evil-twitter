use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Image {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub uploader_id: String, // Supabase UID
    pub s3_url: String,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub remix_data: Option<String>,
    pub created_at: DateTime<Utc>,
}
