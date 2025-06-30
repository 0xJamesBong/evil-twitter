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
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Image {
    #[serde(rename = "-id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(example = "https://example.com/image.jpg")]
    pub url: String,
    #[schema(example = "user123")]
    pub uploader: String,
    #[schema(value_type = String, example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub parent_id: Option<ObjectId>, // if it's a remix
                                     // * * * other possibilities
                                     // pub remix_of: Option<ObjectId>,        // if it's a remix
                                     // pub description: Option<String>,
                                     // pub tags: Option<Vec<String>>,
                                     // pub likes: Option<Vec<String>>,
                                     // pub comments: Option<Vec<String>>,
                                     // pub views: Option<i32>,
                                     // pub is_public: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct RemixMaterial {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,
    pub images: Vec<Image>,
    #[schema(example = "A beautiful landscape with mountains")]
    pub prompt: String,
    #[schema(example = "1024x1024")]
    pub size: String,
}
