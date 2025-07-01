use crate::models::image::{Image, NewImage};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
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
        content = NewImage,
        description = "The image data to create"
    ),
    responses(
        (status = 200, description = "Image created successfully", body = Image)
    )
)]
pub async fn create_image(
    State(state): State<Arc<AppState>>,
    Json(new_image): Json<NewImage>,
) -> Json<Image> {
    let collection = state.db.collection::<Image>("images");

    let image = Image {
        id: None,
        url: new_image.url,
        uploader: new_image.uploader,
        created_at: DateTime::now(),
        parent_id: new_image.parent_id,
    };

    let insert_result = collection.insert_one(&image).await.unwrap();
    let mut saved_image = image;
    saved_image.id = Some(insert_result.inserted_id.as_object_id().unwrap());

    println!("saved_image: {:?}", saved_image);
    Json(saved_image)
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
