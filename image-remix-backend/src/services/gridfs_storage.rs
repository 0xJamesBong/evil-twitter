use futures::StreamExt;
use mongodb::{
    Database,
    bson::{Bson, doc, oid::ObjectId},
};
use serde::{Deserialize, Serialize};
use std::error::Error;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResponse {
    pub file_id: ObjectId,
    pub url: String,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
}

pub struct GridFSStorageService {
    db: Database,
    api_base_url: String,
}

impl GridFSStorageService {
    pub fn new(db: Database, api_base_url: String) -> Self {
        Self { db, api_base_url }
    }

    pub async fn upload_image(
        &self,
        file_data: Vec<u8>,
        file_name: &str,
        mime_type: &str,
        user_id: &str,
    ) -> Result<UploadResponse, Box<dyn Error>> {
        // Generate unique filename
        let file_extension = file_name.split('.').last().unwrap_or("jpg");
        let unique_file_name = format!("{}_{}.{}", Uuid::new_v4(), user_id, file_extension);

        // Get file length before moving file_data
        let file_size = file_data.len() as i64;

        // Create metadata
        let metadata = doc! {
            "user_id": user_id,
            "original_name": file_name,
            "uploaded_at": chrono::Utc::now(),
            "mime_type": mime_type,
        };

        // For now, we'll use a simpler approach by storing the file data directly in a collection
        // This avoids the GridFS version compatibility issues
        let files_collection = self.db.collection::<mongodb::bson::Document>("files");

        let file_doc = doc! {
            "filename": &unique_file_name,
            "metadata": metadata,
            "data": Bson::Binary(mongodb::bson::Binary {
                subtype: mongodb::bson::spec::BinarySubtype::Generic,
                bytes: file_data,
            }),
            "length": file_size,
            "uploadDate": chrono::Utc::now(),
        };

        let insert_result = files_collection.insert_one(file_doc).await?;
        let file_id = insert_result.inserted_id.as_object_id().unwrap();

        // Generate URL pointing to your API
        let url = format!("{}/images/{}/file", self.api_base_url, file_id);

        Ok(UploadResponse {
            file_id,
            url,
            file_name: unique_file_name,
            file_size,
            mime_type: mime_type.to_string(),
        })
    }

    pub async fn download_image(&self, file_id: &ObjectId) -> Result<Vec<u8>, Box<dyn Error>> {
        let files_collection = self.db.collection::<mongodb::bson::Document>("files");

        let file_doc = files_collection
            .find_one(doc! { "_id": file_id })
            .await?
            .ok_or("File not found")?;

        let data = file_doc
            .get_binary_generic("data")
            .map_err(|_| "Invalid file data")?;

        Ok(data.to_vec())
    }

    pub async fn delete_image(&self, file_id: &ObjectId) -> Result<(), Box<dyn Error>> {
        let files_collection = self.db.collection::<mongodb::bson::Document>("files");
        files_collection.delete_one(doc! { "_id": file_id }).await?;
        Ok(())
    }

    pub async fn get_file_metadata(
        &self,
        file_id: &ObjectId,
    ) -> Result<mongodb::bson::Document, Box<dyn Error>> {
        let files_collection = self.db.collection::<mongodb::bson::Document>("files");

        let file_doc = files_collection
            .find_one(doc! { "_id": file_id })
            .await?
            .ok_or("File not found")?;

        Ok(file_doc)
    }

    pub async fn list_user_files(
        &self,
        user_id: &str,
    ) -> Result<Vec<mongodb::bson::Document>, Box<dyn Error>> {
        let files_collection = self.db.collection::<mongodb::bson::Document>("files");

        let filter = doc! { "metadata.user_id": user_id };
        let mut cursor = files_collection.find(filter).await?;

        let mut files = Vec::new();
        while let Some(file) = cursor.next().await {
            files.push(file?);
        }

        Ok(files)
    }
}
