use crate::models::image::{Image, NewImage};
use crate::services::ai_remix::AiRemixService;
use crate::services::gridfs_storage::GridFSStorageService;
use axum::{
    Json,
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::Response,
};
use futures::StreamExt;
use mongodb::bson::DateTime;
use mongodb::{Cursor, Database, bson::doc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::OpenApi;

pub struct AppState {
    pub db: Database,
    pub ai_remix: Arc<AiRemixService>,
}

// /// Health check endpoint
// #[utoipa::path(
//     get,
//     path = "/ping",
//     tag = "health",
//     responses(
//         (status = 200, description = "Health check successful", body = String)
//     )
// )]
// pub async fn ping_handler() -> &'static str {
//     "pong"
// }

/// Create a new image
#[utoipa::path(
    post,
    path = "/images",
    tag = "images",
    request_body(
        content = String,
        description = "Multipart form data with file and metadata"
    ),
    responses(
        (status = 200, description = "Image created successfully", body = Image)
    )
)]
pub async fn create_image(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<Image>, StatusCode> {
    let collection = state.db.collection::<Image>("images");

    let mut uploader = String::new();
    let mut title = String::new();
    let mut description = String::new();
    let mut tags = String::new();
    let mut file_data = Vec::new();
    let mut file_name = String::new();
    let mut mime_type = String::from("image/jpeg"); // default

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "file" => {
                if let Some(name) = field.file_name() {
                    file_name = name.to_string();
                    // Determine MIME type from file extension
                    if let Some(ext) = name.split('.').last() {
                        mime_type = match ext.to_lowercase().as_str() {
                            "png" => "image/png",
                            "gif" => "image/gif",
                            "webp" => "image/webp",
                            "bmp" => "image/bmp",
                            _ => "image/jpeg",
                        }
                        .to_string();
                    }
                }
                let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
                file_data = data.to_vec();
            }
            "uploader" => {
                uploader = field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            }
            "title" => {
                title = field.text().await.unwrap_or_default();
            }
            "description" => {
                description = field.text().await.unwrap_or_default();
            }
            "tags" => {
                tags = field.text().await.unwrap_or_default();
            }
            _ => {}
        }
    }

    if file_data.is_empty() || uploader.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Upload to GridFS
    let storage_service =
        GridFSStorageService::new(state.db.clone(), "http://localhost:3000".to_string());

    let upload_result = storage_service
        .upload_image(file_data, &file_name, &mime_type, &uploader)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Parse tags
    let tags_vec = if !tags.is_empty() {
        Some(tags.split(',').map(|s| s.trim().to_string()).collect())
    } else {
        None
    };

    let image = Image {
        id: None,
        url: upload_result.url,
        uploader,
        created_at: DateTime::now(),
        parent_id: None,
        title: if !title.is_empty() { Some(title) } else { None },
        description: if !description.is_empty() {
            Some(description)
        } else {
            None
        },
        tags: tags_vec,
        file_id: Some(upload_result.file_id),
        file_name: Some(upload_result.file_name),
        file_size: Some(upload_result.file_size),
        mime_type: Some(upload_result.mime_type),
        ai_processed: Some(false),
        ai_model_version: None,
        ai_processing_status: Some("pending".to_string()),
        ai_features: None,
        remix_count: Some(0),
        original_image_id: None,
    };

    let insert_result = collection
        .insert_one(&image)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut saved_image = image;
    saved_image.id = Some(insert_result.inserted_id.as_object_id().unwrap());

    println!("saved_image: {:?}", saved_image);
    Ok(Json(saved_image))
}

/// Download image file from GridFS
#[utoipa::path(
    get,
    path = "/images/{id}/file",
    tag = "images",
    params(
        ("id" = String, Path, description = "Image ID")
    ),
    responses(
        (status = 200, description = "Image file retrieved successfully", content_type = "image/*"),
        (status = 404, description = "Image not found")
    )
)]
pub async fn download_image_file(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Response<Body>, StatusCode> {
    let object_id =
        mongodb::bson::oid::ObjectId::parse_str(&id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let storage_service =
        GridFSStorageService::new(state.db.clone(), "http://localhost:3000".to_string());

    let file_data = storage_service
        .download_image(&object_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    // Get metadata for content type
    let metadata = storage_service
        .get_file_metadata(&object_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let content_type = metadata
        .get_document("metadata")
        .and_then(|m| m.get_str("mime_type"))
        .unwrap_or("image/jpeg");

    Ok(Response::builder()
        .header("Content-Type", content_type)
        .header("Cache-Control", "public, max-age=31536000") // Cache for 1 year
        .body(Body::from(file_data))
        .unwrap())
}

#[derive(serde::Deserialize)]
pub struct ImageQuery {
    user: Option<String>,
}

/// List all images
#[utoipa::path(
    get,
    path = "/images",
    tag = "images",
    params(
        ("user" = Option<String>, Query, description = "Filter by user ID")
    ),
    responses(
        (status = 200, description = "List of images retrieved successfully", body = Vec<Image>)
    )
)]
pub async fn get_images(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ImageQuery>,
) -> Json<Vec<Image>> {
    let collection = state.db.collection::<Image>("images");

    // Build filter based on query parameters
    let filter = if let Some(user_id) = query.user {
        doc! { "uploader": user_id }
    } else {
        doc! {}
    };

    let mut cursor = collection.find(filter).await.unwrap();
    let mut images = Vec::new();
    while let Some(doc) = cursor.next().await {
        images.push(doc.unwrap());
    }
    Json(images)
}

/// Delete an image by ID
#[utoipa::path(
    delete,
    path = "/images/{id}",
    tag = "images",
    params(
        ("id" = String, Path, description = "Image ID")
    ),
    responses(
        (status = 200, description = "Image deleted successfully"),
        (status = 404, description = "Image not found")
    )
)]
pub async fn delete_image(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> StatusCode {
    let collection = state.db.collection::<Image>("images");

    // Convert string ID to ObjectId
    let object_id = match mongodb::bson::oid::ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return StatusCode::BAD_REQUEST,
    };

    // First, get the image to find the GridFS file_id
    let image = match collection.find_one(doc! { "_id": object_id }).await {
        Ok(img) => img,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR,
    };

    if let Some(image) = image {
        // Delete from GridFS if file_id exists
        if let Some(file_id) = image.file_id {
            let storage_service =
                GridFSStorageService::new(state.db.clone(), "http://localhost:3000".to_string());
            let _ = storage_service.delete_image(&file_id).await; // Ignore errors for now
        }
    }

    // Delete from images collection
    let result = collection.delete_one(doc! { "_id": object_id }).await;

    match result {
        Ok(delete_result) if delete_result.deleted_count > 0 => StatusCode::OK,
        Ok(_) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

/// Update an image by ID
#[utoipa::path(
    put,
    path = "/images/{id}",
    tag = "images",
    params(
        ("id" = String, Path, description = "Image ID")
    ),
    request_body(
        content = Image,
        description = "The updated image data"
    ),
    responses(
        (status = 200, description = "Image updated successfully", body = Image),
        (status = 404, description = "Image not found")
    )
)]
pub async fn update_image(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(updates): Json<Image>,
) -> Result<Json<Image>, StatusCode> {
    let collection = state.db.collection::<Image>("images");

    // Convert string ID to ObjectId
    let object_id = match mongodb::bson::oid::ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    let result = collection
        .find_one_and_update(
            doc! { "_id": object_id },
            doc! { "$set": {
                "title": updates.title,
                "description": updates.description,
                "tags": updates.tags,
            }},
        )
        .await;

    match result {
        Ok(Some(updated_image)) => Ok(Json(updated_image)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Remix an image with AI
#[utoipa::path(
    post,
    path = "/images/{id}/remix",
    tag = "images",
    params(
        ("id" = String, Path, description = "Image ID")
    ),
    request_body(
        content = serde_json::Value,
        description = "Remix parameters"
    ),
    responses(
        (status = 200, description = "Image remixed successfully"),
        (status = 404, description = "Image not found"),
        (status = 500, description = "AI remix failed")
    )
)]
pub async fn remix_image(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let collection = state.db.collection::<Image>("images");

    // Convert string ID to ObjectId
    let object_id = match mongodb::bson::oid::ObjectId::parse_str(&id) {
        Ok(oid) => oid,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    // Get the image
    let image = match collection.find_one(doc! { "_id": object_id }).await {
        Ok(img) => img,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let image = match image {
        Some(img) => img,
        None => return Err(StatusCode::NOT_FOUND),
    };

    // Extract remix parameters
    let prompt = body["prompt"].as_str().unwrap_or("enhance this image");
    let strength = body["strength"].as_f64().map(|s| s as f32);
    let guidance_scale = body["guidance_scale"].as_f64().map(|s| s as f32);

    // Remix with AI
    let result = match state
        .ai_remix
        .remix_image_from_url(&image, prompt, strength, guidance_scale)
        .await
    {
        Ok(result) => result,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    if result.success {
        // Update image with remix info
        let _ = collection
            .update_one(
                doc! { "_id": object_id },
                doc! { "$set": {
                    "ai_processed": true,
                    "ai_model_version": "stable-diffusion-v1-5",
                    "ai_processing_status": "completed",
                    "remix_count": { "$inc": 1 }
                }},
            )
            .await;

        Ok(Json(serde_json::json!({
            "success": true,
            "result_url": result.result_url,
            "message": "Image remixed successfully"
        })))
    } else {
        Ok(Json(serde_json::json!({
            "success": false,
            "error": result.error
        })))
    }
}

/// Check AI service health
#[utoipa::path(
    get,
    path = "/ai/health",
    tag = "ai",
    responses(
        (status = 200, description = "AI service health check")
    )
)]
pub async fn ai_health_check(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let is_healthy = match state.ai_remix.health_check().await {
        Ok(healthy) => healthy,
        Err(_) => false,
    };

    Ok(Json(serde_json::json!({
        "ai_service_healthy": is_healthy,
        "service": "image-remix-backend"
    })))
}
