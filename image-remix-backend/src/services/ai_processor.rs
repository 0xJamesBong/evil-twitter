use crate::models::image::Image;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::time::{Duration, sleep};

#[derive(Debug, Serialize)]
pub struct AiProcessingRequest {
    pub image_id: String,
    pub processing_type: String, // "style_transfer", "object_removal", "background_change", etc.
    pub parameters: Option<serde_json::Value>, // AI model specific parameters
    pub style_preset: Option<String>,
    pub source_image_url: String,
}

#[derive(Debug, Deserialize)]
pub struct AiProcessingResponse {
    pub success: bool,
    pub processed_image_url: Option<String>,
    pub error: Option<String>,
    pub processing_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ProcessingStatus {
    pub status: String,        // "pending", "processing", "completed", "failed"
    pub progress: Option<f32>, // 0.0 to 1.0
    pub result_url: Option<String>,
    pub error: Option<String>,
}

pub struct AiProcessorService {
    python_service_url: String,
    client: reqwest::Client,
}

impl AiProcessorService {
    pub fn new(python_service_url: String) -> Self {
        Self {
            python_service_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn process_image(
        &self,
        image: &Image,
        processing_type: &str,
        parameters: Option<serde_json::Value>,
        style_preset: Option<String>,
    ) -> Result<AiProcessingResponse, Box<dyn std::error::Error>> {
        let request = AiProcessingRequest {
            image_id: image.id.as_ref().map(|id| id.to_hex()).unwrap_or_default(),
            processing_type: processing_type.to_string(),
            parameters,
            style_preset,
            source_image_url: image.url.clone(),
        };

        let response = self
            .client
            .post(&format!("{}/process", self.python_service_url))
            .json(&request)
            .send()
            .await?;

        if response.status().is_success() {
            let result: AiProcessingResponse = response.json().await?;
            Ok(result)
        } else {
            Err(format!("AI service error: {}", response.status()).into())
        }
    }

    pub async fn get_processing_status(
        &self,
        processing_id: &str,
    ) -> Result<ProcessingStatus, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get(&format!(
                "{}/status/{}",
                self.python_service_url, processing_id
            ))
            .send()
            .await?;

        if response.status().is_success() {
            let status: ProcessingStatus = response.json().await?;
            Ok(status)
        } else {
            Err(format!("Failed to get status: {}", response.status()).into())
        }
    }

    pub async fn apply_style_transfer(
        &self,
        image: &Image,
        style_preset: &str,
    ) -> Result<AiProcessingResponse, Box<dyn std::error::Error>> {
        let parameters = serde_json::json!({
            "style_preset": style_preset,
            "strength": 0.8,
            "preserve_colors": true
        });

        self.process_image(
            image,
            "style_transfer",
            Some(parameters),
            Some(style_preset.to_string()),
        )
        .await
    }

    pub async fn remove_background(
        &self,
        image: &Image,
    ) -> Result<AiProcessingResponse, Box<dyn std::error::Error>> {
        self.process_image(image, "background_removal", None, None)
            .await
    }

    pub async fn enhance_image(
        &self,
        image: &Image,
        enhancement_type: &str,
    ) -> Result<AiProcessingResponse, Box<dyn std::error::Error>> {
        let parameters = serde_json::json!({
            "enhancement_type": enhancement_type,
            "strength": 0.6
        });

        self.process_image(image, "enhancement", Some(parameters), None)
            .await
    }
}
