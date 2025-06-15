use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct NewImage {
    pub url: String,
    pub uploader: String,
    #[serde(default)]
    pub parent_id: Option<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Image {
    #[serde(rename = "-id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub url: String,
    pub uploader: String,
    pub created_at: DateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemixMaterial {
    pub id: Option<ObjectId>,
    pub images: Vec<Image>,
    pub prompt: String,
    pub size: String,
}
