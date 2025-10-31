use axum::{Json, extract::State, http::StatusCode};
use mongodb::Database;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::models::tokens::{
    enums::TokenType,
    token_pricing::{PriceEntry, Prices},
};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeRequest {
    #[schema(example = "SOL")]
    pub from_token: TokenType,
    #[schema(example = "USDC")]
    pub to_token: TokenType,
    #[schema(example = "2")]
    pub amount: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExchangeResponse {
    #[schema(example = "SOL")]
    pub from_token: TokenType,
    #[schema(example = "USDC")]
    pub to_token: TokenType,
    #[schema(example = "2")]
    pub input_amount: i64,
    #[schema(example = "1330")]
    pub output_amount: i64,
    #[schema(example = "665.0")]
    pub rate_used: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PriceRatioSchema {
    #[schema(example = "1")]
    pub token_units: i64,
    #[schema(example = "700")]
    pub usdc_units: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PriceEntrySchema {
    pub ratio: PriceRatioSchema,
    #[schema(example = "0.5")]
    pub spread: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PricesResponse {
    #[schema(example = "DOOLER")]
    pub dooler: PriceEntrySchema,
    #[schema(example = "USDC")]
    pub usdc: PriceEntrySchema,
    #[schema(example = "BLING")]
    pub bling: PriceEntrySchema,
    #[schema(example = "SOL")]
    pub sol: PriceEntrySchema,
}

/// Get current prices and spreads for all tokens
#[utoipa::path(
    get,
    path = "/exchange/prices",
    responses(
        (status = 200, description = "Current prices retrieved", body = PricesResponse)
    ),
    tag = "exchange"
)]
pub async fn get_prices() -> Json<PricesResponse> {
    let prices = Prices::new();

    let price_entry_to_schema = |entry: PriceEntry| PriceEntrySchema {
        ratio: PriceRatioSchema {
            token_units: entry.ratio.token_units,
            usdc_units: entry.ratio.usdc_units,
        },
        spread: entry.spread,
    };

    Json(PricesResponse {
        dooler: price_entry_to_schema(prices.dooler),
        usdc: price_entry_to_schema(prices.usdc),
        bling: price_entry_to_schema(prices.bling),
        sol: price_entry_to_schema(prices.sol),
    })
}

/// Exchange tokens (swap one token type for another)
#[utoipa::path(
    post,
    path = "/exchange",
    request_body = ExchangeRequest,
    responses(
        (status = 200, description = "Exchange completed", body = ExchangeResponse),
        (status = 400, description = "Invalid request")
    ),
    tag = "exchange"
)]
pub async fn post_exchange(
    State(_db): State<Database>,
    Json(req): Json<ExchangeRequest>,
) -> Result<Json<ExchangeResponse>, (StatusCode, Json<serde_json::Value>)> {
    let prices = Prices::new();

    // Validate request
    if req.amount <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Amount must be greater than 0"})),
        ));
    }

    if req.from_token == req.to_token {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Cannot exchange token for itself"})),
        ));
    }

    // Calculate exchange
    let output = if req.from_token == TokenType::Usdc {
        // Converting USDC to another token
        prices.usdc_to_token(req.to_token.clone(), req.amount)
    } else if req.to_token == TokenType::Usdc {
        // Converting token to USDC
        prices.token_to_usdc(req.from_token.clone(), req.amount)
    } else {
        // Converting between two non-USDC tokens via USDC intermediary
        // Step 1: Convert from_token to USDC
        let usdc_value = prices.token_to_usdc(req.from_token.clone(), req.amount);
        // Step 2: Convert USDC to to_token
        prices.usdc_to_token(req.to_token.clone(), usdc_value)
    };

    let rate_used = if req.amount > 0 {
        output as f64 / req.amount as f64
    } else {
        0.0
    };

    Ok(Json(ExchangeResponse {
        from_token: req.from_token,
        to_token: req.to_token,
        input_amount: req.amount,
        output_amount: output,
        rate_used,
    }))
}
