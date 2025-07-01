use crate::models::image::{Image, NewImage};
use axum::{
    Json,
    extract::{Multipart, Path, State},
    http::StatusCode,
};
use base64;
use futures::StreamExt;
use mongodb::bson::DateTime;
use mongodb::{Cursor, Database, bson::doc};
use std::sync::Arc;
use utoipa::OpenApi;

pub struct AppState {
    pub db: Database,
}

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/ping",
    tag = "health",
    responses(
        (status = 200, description = "Health check successful", body = String)
    )
)]
pub async fn ping_handler() -> &'static str {
    "pong"
}

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

    // For now, we'll store the file data as base64 in the URL field
    // In a real implementation, you'd save this to a file system or cloud storage
    let base64_data = base64::encode(&file_data);
    let url = format!("data:image/jpeg;base64,{}", base64_data);

    let image = Image {
        id: None,
        url,
        uploader,
        created_at: DateTime::now(),
        parent_id: None,
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

// pub async fn create_image(
//     State(state): State<Arc<AppState>>,
//     mut new_image: Json<Image>,
// ) -> Json<Image> {
//     let collection = state.db.collection::<Image>("images");
//     new_image.created_at = DateTime::now();
//     let insert_result = collection.insert_one(new_image.0.clone()).await.unwrap();

//     new_image.id = Some(insert_result.inserted_id.as_object_id().unwrap());

//     new_image
// }

/// List all images
#[utoipa::path(
    get,
    path = "/images",
    tag = "images",
    responses(
        (status = 200, description = "List of images retrieved successfully", body = Vec<Image>)
    )
)]
pub async fn get_images(State(state): State<Arc<AppState>>) -> Json<Vec<Image>> {
    let collection = state.db.collection::<Image>("images");
    let mut cursor = collection.find(doc! {}).await.unwrap();
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
                "url": updates.url,
                "uploader": updates.uploader,
            }},
        )
        .await;

    match result {
        Ok(Some(updated_image)) => Ok(Json(updated_image)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

// https://raw.githubusercontent.com/0xJamesBong/image-remix/refs/heads/main/image-remix-frontend/assets/pics/tom_holland_7.jpg?token=GHSAT0AAAAAADAVO7HJ7M47JH2GXGLELKFM2CODMKQ
