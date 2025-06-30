use crate::models::image::{Image, NewImage};
use axum::{Json, extract::State};
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

// https://raw.githubusercontent.com/0xJamesBong/image-remix/refs/heads/main/image-remix-frontend/assets/pics/tom_holland_7.jpg?token=GHSAT0AAAAAADAVO7HJ7M47JH2GXGLELKFM2CODMKQ
