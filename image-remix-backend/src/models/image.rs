use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
pub struct NewImage {
    #[schema(example = "https://example.com/image.jpg")]
    pub url: String,
    #[schema(example = "user123")]
    pub uploader: String,
    #[serde(default)]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub parent_id: Option<ObjectId>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Image {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(example = "http://localhost:3000/images/507f1f77bcf86cd799439011/file")]
    pub url: String,

    #[schema(example = "user123")]
    pub uploader: String,

    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub parent_id: Option<ObjectId>, // if it's a remix

    // New fields for better image management
    pub title: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,

    // GridFS file metadata
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub file_id: Option<ObjectId>, // GridFS file ID
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,

    // AI processing metadata
    pub ai_processed: Option<bool>,
    pub ai_model_version: Option<String>,
    pub ai_processing_status: Option<String>, // "pending", "processing", "completed", "failed"
    pub ai_features: Option<Vec<String>>, // ["face_detection", "object_recognition", "style_transfer"]

    // Remix chain
    pub remix_count: Option<i32>,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub original_image_id: Option<ObjectId>, // Points to the very first image in the chain
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct RemixMaterial {
    #[schema(example = "vintage_style")]
    pub style: String,
    #[schema(example = "Apply vintage film effect")]
    pub description: String,
    #[schema(example = "https://example.com/style-preset.json")]
    pub preset_url: Option<String>,
}

// New struct for AI processing requests
#[derive(Debug, Deserialize, ToSchema)]
pub struct AiProcessingRequest {
    pub image_id: String,
    pub processing_type: String, // "style_transfer", "object_removal", "background_change", etc.
    pub parameters: Option<serde_json::Value>, // AI model specific parameters
    pub style_preset: Option<String>,
}

// New struct for AI processing results
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct AiProcessingResult {
    pub image_id: String,
    pub processing_type: String,
    pub result_url: String,
    pub processing_time: f64,
    pub confidence_score: Option<f64>,
    pub metadata: Option<serde_json::Value>,
}
