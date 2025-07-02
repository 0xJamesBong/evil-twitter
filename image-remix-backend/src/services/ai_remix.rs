use crate::models::image::Image;
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::time::{Duration, sleep};

#[derive(Debug, Serialize)]
pub struct RemixRequest {
    pub prompt: String,
    pub strength: Option<f32>,
    pub guidance_scale: Option<f32>,
    pub image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RemixResponse {
    pub success: bool,
    pub result_url: Option<String>,
    pub error: Option<String>,
}

pub struct AiRemixService {
    python_service_url: String,
    client: reqwest::Client,
}

impl AiRemixService {
    pub fn new(python_service_url: String) -> Self {
        Self {
            python_service_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn remix_image_from_url(
        &self,
        image: &Image,
        prompt: &str,
        strength: Option<f32>,
        guidance_scale: Option<f32>,
    ) -> Result<RemixResponse, Box<dyn std::error::Error>> {
        let request = RemixRequest {
            prompt: prompt.to_string(),
            strength,
            guidance_scale,
            image_url: Some(image.url.clone()),
        };

        let response = self
            .client
            .post(&format!("{}/remix-url", self.python_service_url))
            .json(&request)
            .send()
            .await?;

        if response.status().is_success() {
            let result: RemixResponse = response.json().await?;
            Ok(result)
        } else {
            Err(format!("AI service error: {}", response.status()).into())
        }
    }

    pub async fn remix_image_with_file(
        &self,
        image_data: Vec<u8>,
        prompt: &str,
        strength: Option<f32>,
        guidance_scale: Option<f32>,
    ) -> Result<RemixResponse, Box<dyn std::error::Error>> {
        // Create multipart form data
        let form = reqwest::multipart::Form::new()
            .text("prompt", prompt.to_string())
            .text("strength", strength.unwrap_or(0.6).to_string())
            .text("guidance_scale", guidance_scale.unwrap_or(7.5).to_string())
            .part(
                "file",
                reqwest::multipart::Part::bytes(image_data).file_name("image.jpg"),
            );

        let response = self
            .client
            .post(&format!("{}/remix", self.python_service_url))
            .multipart(form)
            .send()
            .await?;

        if response.status().is_success() {
            let result: RemixResponse = response.json().await?;
            Ok(result)
        } else {
            Err(format!("AI service error: {}", response.status()).into())
        }
    }

    pub async fn health_check(&self) -> Result<bool, Box<dyn std::error::Error>> {
        let response = self
            .client
            .get(&format!("{}/health", self.python_service_url))
            .send()
            .await?;

        Ok(response.status().is_success())
    }
}
