use crate::{
    models::{
        asset::{Asset, AssetStatus, AssetType},
        marketplace::{AssetListing, ListingStatus, TradeReceipt},
        shop::{ShopItem, ShopPurchaseReceipt},
        token::{LedgerEntryType, TokenBalance, TokenLedgerEntry},
    },
    utils::auth::get_authenticated_user,
};
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use futures::TryStreamExt;
use mongodb::{
    Collection, Database,
    bson::{DateTime, doc, oid::ObjectId, to_bson},
    options::ReturnDocument,
};
use serde::Deserialize;
use serde_json::json;
use utoipa::ToSchema;

// Balance DTOs ----------------------------------------------------------------

#[derive(Debug, Deserialize, ToSchema)]
pub struct AdjustBalanceRequest {
    #[schema(example = "EVL")]
    pub token_symbol: String,

    #[schema(example = "1000")]
    pub available_delta: i64,

    #[schema(example = "0")]
    pub locked_delta: Option<i64>,

    #[schema(value_type = String, example = "purchase")]
    pub reference_type: Option<String>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub reference_id: Option<String>,

    #[schema(example = "Bought a cursed megaphone")]
    pub notes: Option<String>,
}

#[utoipa::path(
    get,
    path = "/economy/users/{user_id}/balances",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "Balances retrieved", body = Vec<TokenBalance>),
        (status = 400, description = "Invalid user ID supplied")
    ),
    tag = "economy"
)]
pub async fn get_user_balances(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Vec<TokenBalance>>, (StatusCode, Json<serde_json::Value>)> {
    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let auth_user_id = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;

    if auth_user_id.to_hex() != user_id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Cannot view balances for other users"})),
        ));
    }

    let collection: Collection<TokenBalance> = db.collection("token_balances");
    maybe_bootstrap_balances(&collection, &user_id)
        .await
        .map_err(|err| err)?;
    let mut cursor = collection
        .find(doc! { "user_id": &user_id })
        .await
        .map_err(internal_error)?;

    let mut balances = Vec::new();
    while let Some(balance) = cursor.try_next().await.map_err(internal_error)? {
        balances.push(balance);
    }

    Ok(Json(balances))
}

#[utoipa::path(
    post,
    path = "/economy/users/{user_id}/balances/adjust",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    request_body = AdjustBalanceRequest,
    responses(
        (status = 200, description = "Balance adjusted", body = TokenBalance),
        (status = 400, description = "Balance would become negative"),
        (status = 404, description = "Balance document not found"),
        (status = 500, description = "Database error")
    ),
    tag = "economy"
)]
pub async fn adjust_user_balance(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    headers: HeaderMap,
    Json(request): Json<AdjustBalanceRequest>,
) -> Result<Json<TokenBalance>, (StatusCode, Json<serde_json::Value>)> {
    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let auth_user_id = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;

    if auth_user_id.to_hex() != user_id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Cannot adjust balances for other users"})),
        ));
    }

    let balance = apply_balance_change(&db, &user_id, &request).await?;
    Ok(Json(balance))
}

pub(crate) async fn apply_balance_change(
    db: &Database,
    user_id: &str,
    request: &AdjustBalanceRequest,
) -> Result<TokenBalance, (StatusCode, Json<serde_json::Value>)> {
    let balance_collection: Collection<TokenBalance> = db.collection("token_balances");
    let ledger_collection: Collection<TokenLedgerEntry> = db.collection("token_ledger");

    let locked_delta = request.locked_delta.unwrap_or(0);

    if request.available_delta < 0 || locked_delta < 0 {
        match balance_collection
            .find_one(doc! {
                "user_id": user_id,
                "token_symbol": &request.token_symbol
            })
            .await
            .map_err(internal_error)?
        {
            Some(current) => {
                if current.available + request.available_delta < 0
                    || current.locked + locked_delta < 0
                {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({"error": "Insufficient balance"})),
                    ));
                }
            }
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({"error": "Balance document missing"})),
                ));
            }
        }
    }

    if request.available_delta == 0 && locked_delta == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "No balance change requested"})),
        ));
    }

    let filter = balance_filter(
        &user_id,
        &request.token_symbol,
        request.available_delta,
        locked_delta,
    );

    let now = DateTime::now();
    let update = doc! {
        "$inc": doc! {
            "available": request.available_delta,
            "locked": locked_delta,
        },
        "$set": doc! {
            "updated_at": now
        },
        "$setOnInsert": doc! {
            "user_id": &user_id,
            "token_symbol": &request.token_symbol,
            "available": 0,
            "locked": 0,
            "created_at": now,
        }
    };

    let updated_balance = balance_collection
        .find_one_and_update(filter, update)
        .return_document(ReturnDocument::After)
        .upsert(true)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Balance update rejected"})),
            )
        })?;

    if updated_balance.available < 0 || updated_balance.locked < 0 {
        // In theory guarded by filter, but double check
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Balance would become negative"})),
        ));
    }

    let entry_type = determine_entry_type(request, request.available_delta, locked_delta);
    let entry = TokenLedgerEntry {
        id: None,
        user_id: user_id.to_string(),
        token_symbol: request.token_symbol.clone(),
        amount: request.available_delta + locked_delta,
        entry_type,
        reference_type: request.reference_type.clone(),
        reference_id: request.reference_id.clone(),
        created_at: DateTime::now(),
        notes: request.notes.clone(),
    };

    ledger_collection
        .insert_one(entry)
        .await
        .map_err(internal_error)?;

    Ok(updated_balance)
}

fn classify_ledger_entry(available_delta: i64, locked_delta: i64) -> LedgerEntryType {
    match (available_delta >= 0, locked_delta >= 0) {
        (true, true) => LedgerEntryType::Deposit,
        (true, false) if available_delta == 0 => LedgerEntryType::Release,
        (false, true) if locked_delta == 0 => LedgerEntryType::Withdrawal,
        (false, false) => LedgerEntryType::Adjustment,
        _ => LedgerEntryType::Adjustment,
    }
}

fn balance_filter(
    user_id: &str,
    token_symbol: &str,
    available_delta: i64,
    locked_delta: i64,
) -> mongodb::bson::Document {
    let mut filter = doc! { "user_id": user_id, "token_symbol": token_symbol };
    let mut expressions = Vec::new();

    if available_delta < 0 {
        expressions.push(doc! {
            "$gte": [
                { "$add": [ "$available", available_delta ] },
                0
            ]
        });
    }

    if locked_delta < 0 {
        expressions.push(doc! {
            "$gte": [
                { "$add": [ "$locked", locked_delta ] },
                0
            ]
        });
    }

    if !expressions.is_empty() {
        filter.insert("$expr", doc! { "$and": expressions });
    }

    filter
}

// Asset DTOs -------------------------------------------------------------------
fn determine_entry_type(
    request: &AdjustBalanceRequest,
    available_delta: i64,
    locked_delta: i64,
) -> LedgerEntryType {
    match request.reference_type.as_deref() {
        Some("shop_purchase") | Some("market_purchase") => LedgerEntryType::Purchase,
        Some("market_sale") => LedgerEntryType::Sale,
        Some("market_fee") => LedgerEntryType::TradeFee,
        Some("market_distribution") => LedgerEntryType::TradePayout,
        _ => classify_ledger_entry(available_delta, locked_delta),
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateAssetRequest {
    pub asset_type: AssetType,

    #[schema(example = "Eldritch Megaphone")]
    pub name: String,

    #[schema(example = "Amplifies your evil tweets for 24 hours.")]
    pub description: Option<String>,

    #[schema(example = "https://cdn.evil-twitter.com/assets/eldritch-megaphone.png")]
    pub media_url: Option<String>,

    #[schema(value_type = Object)]
    pub attributes: Option<serde_json::Value>,

    #[schema(example = "true")]
    pub tradeable: Option<bool>,

    /// Optional override for the owning user; must match the authenticated user.
    #[serde(default)]
    #[schema(value_type = Option<String>, example = "507f1f77bcf86cd799439011")]
    pub owner_id: Option<String>,
}

#[utoipa::path(
    post,
    path = "/economy/assets",
    request_body = CreateAssetRequest,
    responses(
        (status = 201, description = "Asset created", body = Asset)
    ),
    tag = "economy"
)]
pub async fn create_asset(
    State(db): State<Database>,
    headers: HeaderMap,
    Json(payload): Json<CreateAssetRequest>,
) -> Result<(StatusCode, Json<Asset>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<Asset> = db.collection("assets");

    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let auth_user_id = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;
    let target_owner = payload
        .owner_id
        .clone()
        .unwrap_or_else(|| auth_user_id.to_hex());

    if target_owner != auth_user_id.to_hex() {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Cannot create assets for other users"
            })),
        ));
    }

    let mut asset = Asset::new(&target_owner, payload.asset_type, &payload.name);
    asset.description = payload.description.clone();
    asset.media_url = payload.media_url.clone();
    asset.attributes = payload.attributes.clone();
    asset.tradeable = payload.tradeable.unwrap_or(true);
    asset.status = AssetStatus::Active;
    asset.created_at = DateTime::now();
    asset.updated_at = asset.created_at;

    let insert_result = collection
        .insert_one(&asset)
        .await
        .map_err(internal_error)?;

    if let Some(id) = insert_result.inserted_id.as_object_id() {
        asset.id = Some(id);
    }

    Ok((StatusCode::CREATED, Json(asset)))
}

#[utoipa::path(
    get,
    path = "/economy/users/{user_id}/assets",
    params(
        ("user_id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "Assets retrieved", body = Vec<Asset>)
    ),
    tag = "economy"
)]
pub async fn get_user_assets(
    State(db): State<Database>,
    Path(user_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Vec<Asset>>, (StatusCode, Json<serde_json::Value>)> {
    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let auth_user_id = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;

    if auth_user_id.to_hex() != user_id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Cannot view assets for other users"})),
        ));
    }

    let collection: Collection<Asset> = db.collection("assets");
    let mut cursor = collection
        .find(doc! { "owner_id": &user_id })
        .await
        .map_err(internal_error)?;

    let mut assets = Vec::new();
    while let Some(asset) = cursor.try_next().await.map_err(internal_error)? {
        assets.push(asset);
    }

    Ok(Json(assets))
}

// Shop endpoints ---------------------------------------------------------------

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateShopItemRequest {
    #[schema(example = "Infernal Booster Pack")]
    pub name: String,
    pub description: Option<String>,
    pub media_url: Option<String>,
    #[schema(example = "tool")]
    pub asset_blueprint: String,
    #[schema(value_type = Object)]
    pub asset_attributes: Option<serde_json::Value>,
    #[schema(example = "EVL")]
    pub price_token: String,
    #[schema(example = "25000")]
    pub price_amount: i64,
    #[schema(example = "100")]
    pub total_supply: Option<i64>,
    #[schema(example = "true")]
    pub is_active: Option<bool>,
}

#[utoipa::path(
    post,
    path = "/economy/shop/items",
    request_body = CreateShopItemRequest,
    responses(
        (status = 201, description = "Shop item created", body = ShopItem)
    ),
    tag = "economy"
)]
pub async fn create_shop_item(
    State(db): State<Database>,
    Json(payload): Json<CreateShopItemRequest>,
) -> Result<(StatusCode, Json<ShopItem>), (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<ShopItem> = db.collection("shop_items");
    let now = DateTime::now();
    let mut item = ShopItem {
        id: None,
        name: payload.name.clone(),
        description: payload.description.clone(),
        media_url: payload.media_url.clone(),
        asset_blueprint: payload.asset_blueprint.clone(),
        asset_attributes: payload.asset_attributes.clone(),
        price_token: payload.price_token.clone(),
        price_amount: payload.price_amount,
        total_supply: payload.total_supply,
        remaining_supply: payload.total_supply,
        is_active: payload.is_active.unwrap_or(true),
        created_at: now,
        updated_at: now,
    };

    let insert_result = collection.insert_one(&item).await.map_err(internal_error)?;

    if let Some(id) = insert_result.inserted_id.as_object_id() {
        item.id = Some(id);
    }

    Ok((StatusCode::CREATED, Json(item)))
}

#[utoipa::path(
    get,
    path = "/economy/shop/items",
    responses(
        (status = 200, description = "Active shop items", body = Vec<ShopItem>)
    ),
    tag = "economy"
)]
pub async fn list_shop_items(
    State(db): State<Database>,
) -> Result<Json<Vec<ShopItem>>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<ShopItem> = db.collection("shop_items");
    maybe_bootstrap_shop_items(&collection)
        .await
        .map_err(|err| err)?;
    let mut cursor = collection
        .find(doc! { "is_active": true })
        .await
        .map_err(internal_error)?;

    let mut items = Vec::new();
    while let Some(item) = cursor.try_next().await.map_err(internal_error)? {
        if let Some(remaining) = item.remaining_supply {
            if remaining <= 0 {
                continue;
            }
        }
        items.push(item);
    }

    Ok(Json(items))
}

#[derive(Debug, Default, Deserialize, ToSchema)]
pub struct PurchaseShopItemRequest {
    /// Optional recipient user id; gifting is not yet supported so this must match the buyer.
    #[serde(default)]
    #[schema(value_type = Option<String>, example = "507f1f77bcf86cd799439011")]
    pub gift_to: Option<String>,
}

#[utoipa::path(
    post,
    path = "/economy/shop/items/{item_id}/purchase",
    params(
        ("item_id" = String, Path, description = "Shop item ID")
    ),
    request_body = PurchaseShopItemRequest,
    responses(
        (status = 201, description = "Purchase successful", body = ShopPurchaseReceipt),
        (status = 400, description = "Purchase failed")
    ),
    tag = "economy"
)]
pub async fn purchase_shop_item(
    State(db): State<Database>,
    Path(item_id): Path<String>,
    headers: HeaderMap,
    Json(request): Json<PurchaseShopItemRequest>,
) -> Result<(StatusCode, Json<ShopPurchaseReceipt>), (StatusCode, Json<serde_json::Value>)> {
    let item_oid = ObjectId::parse_str(&item_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid item id"})),
        )
    })?;

    let shop_collection: Collection<ShopItem> = db.collection("shop_items");
    let assets_collection: Collection<Asset> = db.collection("assets");
    let receipts_collection: Collection<ShopPurchaseReceipt> = db.collection("shop_purchases");
    let balances_collection: Collection<TokenBalance> = db.collection("token_balances");

    let item = shop_collection
        .find_one(doc! { "_id": &item_oid })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Shop item not found"})),
            )
        })?;

    if !item.is_active {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Item is not active"})),
        ));
    }

    if let Some(remaining) = item.remaining_supply {
        if remaining <= 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Item sold out"})),
            ));
        }
    }

    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let buyer_oid = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;
    let buyer_id_hex = buyer_oid.to_hex();

    maybe_bootstrap_balances(&balances_collection, &buyer_id_hex)
        .await
        .map_err(|err| err)?;

    if let Some(gift_to) = request.gift_to.as_ref() {
        if gift_to != &buyer_id_hex {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "error": "Gifting shop purchases to other users is not yet supported"
                })),
            ));
        }
    }

    let recipient_id = request
        .gift_to
        .clone()
        .unwrap_or_else(|| buyer_id_hex.clone());

    let remove_funds_request = AdjustBalanceRequest {
        token_symbol: item.price_token.clone(),
        available_delta: -item.price_amount,
        locked_delta: Some(0),
        reference_type: Some("shop_purchase".to_string()),
        reference_id: Some(item_oid.to_hex()),
        notes: Some(format!("Purchased {}", item.name)),
    };

    apply_balance_change(&db, &buyer_id_hex, &remove_funds_request).await?;

    // Mint asset to user
    let asset_type = match item.asset_blueprint.to_lowercase().as_str() {
        "tool" => AssetType::Tool,
        "reward" => AssetType::Reward,
        "honor" | "honour" => AssetType::Honor,
        "badge" => AssetType::Badge,
        _ => AssetType::Collectible,
    };

    let mut asset = Asset::new(&recipient_id, asset_type, item.name.clone());
    asset.description = item.description.clone();
    asset.media_url = item.media_url.clone();
    asset.attributes = item.asset_attributes.clone();
    asset.tradeable = true;
    asset.status = AssetStatus::Active;
    asset.created_at = DateTime::now();
    asset.updated_at = asset.created_at;

    let insert_result = assets_collection
        .insert_one(&asset)
        .await
        .map_err(internal_error)?;
    if let Some(id) = insert_result.inserted_id.as_object_id() {
        asset.id = Some(id);
    }

    // Decrement supply if finite
    if item.total_supply.is_some() {
        let update_result = shop_collection
            .update_one(
                doc! { "_id": &item_oid, "is_active": true, "remaining_supply": { "$gte": 1 } },
                doc! {
                    "$inc": { "remaining_supply": -1 },
                    "$set": { "updated_at": DateTime::now() }
                },
            )
            .await
            .map_err(internal_error)?;

        if update_result.modified_count == 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Item sold out"})),
            ));
        }
    } else {
        shop_collection
            .update_one(
                doc! { "_id": &item_oid },
                doc! { "$set": { "updated_at": DateTime::now() } },
            )
            .await
            .map_err(internal_error)?;
    }

    let receipt = ShopPurchaseReceipt {
        id: None,
        user_id: recipient_id.clone(),
        asset_id: asset.id.expect("asset id should exist after insert"),
        shop_item_id: item_oid,
        price_token: item.price_token.clone(),
        price_amount: item.price_amount,
        purchased_at: DateTime::now(),
    };

    let insert_receipt = receipts_collection
        .insert_one(&receipt)
        .await
        .map_err(internal_error)?;

    let mut receipt = receipt;
    if let Some(id) = insert_receipt.inserted_id.as_object_id() {
        receipt.id = Some(id);
    }

    Ok((StatusCode::CREATED, Json(receipt)))
}

// Marketplace endpoints -------------------------------------------------------

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateListingRequest {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub asset_id: String,

    #[schema(example = "EVL")]
    pub price_token: String,

    #[schema(example = "150000")]
    pub price_amount: i64,

    #[schema(example = "250")]
    pub fee_bps: Option<i32>,
}

#[utoipa::path(
    post,
    path = "/economy/marketplace/listings",
    request_body = CreateListingRequest,
    responses(
        (status = 201, description = "Listing created", body = AssetListing)
    ),
    tag = "economy"
)]
pub async fn create_listing(
    State(db): State<Database>,
    headers: HeaderMap,
    Json(payload): Json<CreateListingRequest>,
) -> Result<(StatusCode, Json<AssetListing>), (StatusCode, Json<serde_json::Value>)> {
    let assets_collection: Collection<Asset> = db.collection("assets");
    let listings_collection: Collection<AssetListing> = db.collection("asset_listings");

    if payload.price_amount <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Listing price must be positive"})),
        ));
    }

    let asset_oid = ObjectId::parse_str(&payload.asset_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid asset id"})),
        )
    })?;

    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let seller_oid = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;
    let seller_id_hex = seller_oid.to_hex();

    let asset = assets_collection
        .find_one(doc! { "_id": &asset_oid })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Asset not found"})),
            )
        })?;

    if asset.owner_id != seller_id_hex {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Seller does not own asset"})),
        ));
    }

    if !asset.tradeable {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Asset is not tradeable"})),
        ));
    }

    if matches!(asset.status, AssetStatus::Listed | AssetStatus::Locked) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Asset already locked or listed"})),
        ));
    }

    let now = DateTime::now();
    let update_result = assets_collection
        .update_one(
            doc! {
                "_id": &asset_oid,
                "owner_id": &seller_id_hex,
                "status": to_bson(&AssetStatus::Active).expect("serialize Active status")
            },
            doc! {
                "$set": {
                    "is_locked": true,
                    "status": to_bson(&AssetStatus::Listed).expect("serialize Listed status"),
                    "updated_at": now
                }
            },
        )
        .await
        .map_err(internal_error)?;

    if update_result.modified_count == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Asset is no longer available for listing"})),
        ));
    }

    let mut listing = AssetListing {
        id: None,
        asset_id: asset_oid,
        seller_id: seller_id_hex,
        price_token: payload.price_token.clone(),
        price_amount: payload.price_amount,
        fee_bps: payload.fee_bps.unwrap_or(250),
        created_at: now,
        updated_at: now,
        status: ListingStatus::Active,
        buyer_id: None,
        filled_at: None,
    };

    let insert = listings_collection
        .insert_one(&listing)
        .await
        .map_err(internal_error)?;

    if let Some(id) = insert.inserted_id.as_object_id() {
        listing.id = Some(id);
    }

    Ok((StatusCode::CREATED, Json(listing)))
}

#[utoipa::path(
    get,
    path = "/economy/marketplace/listings",
    responses(
        (status = 200, description = "Active listings", body = Vec<AssetListing>)
    ),
    tag = "economy"
)]
pub async fn list_marketplace_listings(
    State(db): State<Database>,
) -> Result<Json<Vec<AssetListing>>, (StatusCode, Json<serde_json::Value>)> {
    let collection: Collection<AssetListing> = db.collection("asset_listings");
    let mut cursor = collection
        .find(doc! { "status": ListingStatus::Active.to_string() })
        .await
        .map_err(internal_error)?;

    let mut listings = Vec::new();
    while let Some(listing) = cursor.try_next().await.map_err(internal_error)? {
        listings.push(listing);
    }

    Ok(Json(listings))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct PurchaseListingRequest {
    /// Optional recipient user id; gifting is not yet supported so this must match the buyer.
    #[serde(default)]
    #[schema(value_type = Option<String>, example = "507f1f77bcf86cd799439011")]
    pub gift_to: Option<String>,
}

#[utoipa::path(
    post,
    path = "/economy/marketplace/listings/{listing_id}/buy",
    params(
        ("listing_id" = String, Path, description = "Listing ID")
    ),
    request_body = PurchaseListingRequest,
    responses(
        (status = 201, description = "Trade executed", body = TradeReceipt),
        (status = 400, description = "Trade failed")
    ),
    tag = "economy"
)]
pub async fn purchase_listing(
    State(db): State<Database>,
    Path(listing_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<PurchaseListingRequest>,
) -> Result<(StatusCode, Json<TradeReceipt>), (StatusCode, Json<serde_json::Value>)> {
    let listings_collection: Collection<AssetListing> = db.collection("asset_listings");
    let assets_collection: Collection<Asset> = db.collection("assets");
    let receipts_collection: Collection<TradeReceipt> = db.collection("trade_receipts");
    let balances_collection: Collection<TokenBalance> = db.collection("token_balances");

    let listing_oid = ObjectId::parse_str(&listing_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid listing id"})),
        )
    })?;

    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let buyer_oid = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;
    let buyer_id_hex = buyer_oid.to_hex();

    if let Some(gift_to) = payload.gift_to.as_ref() {
        if gift_to != &buyer_id_hex {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({
                    "error": "Gifting marketplace purchases to other users is not yet supported"
                })),
            ));
        }
    }

    let recipient_id = payload
        .gift_to
        .clone()
        .unwrap_or_else(|| buyer_id_hex.clone());
    maybe_bootstrap_balances(&balances_collection, &buyer_id_hex)
        .await
        .map_err(|err| err)?;

    let now = DateTime::now();
    let listing = listings_collection
        .find_one_and_update(
            doc! {
                "_id": &listing_oid,
                "status": to_bson(&ListingStatus::Active).expect("serialize listing status")
            },
            doc! {
                "$set": {
                    "status": to_bson(&ListingStatus::Escrow).expect("serialize listing status"),
                    "updated_at": now
                }
            },
        )
        .return_document(ReturnDocument::Before)
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Listing is no longer available"})),
            )
        })?;

    if listing.seller_id == buyer_id_hex {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Cannot buy your own asset"})),
        ));
    }

    let asset = assets_collection
        .find_one(doc! { "_id": &listing.asset_id })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Asset not found"})),
            )
        })?;

    if asset.owner_id != listing.seller_id {
        revert_listing_to_active(&listings_collection, &listing_oid).await;
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Owner mismatch"})),
        ));
    }

    let fee_amount = listing.price_amount * listing.fee_bps as i64 / 10_000;
    let seller_payout = listing.price_amount - fee_amount;
    let token_symbol = listing.price_token.clone();

    let buyer_adjustment = AdjustBalanceRequest {
        token_symbol: token_symbol.clone(),
        available_delta: -listing.price_amount,
        locked_delta: Some(0),
        reference_type: Some("market_purchase".to_string()),
        reference_id: Some(listing_oid.to_hex()),
        notes: Some(format!(
            "Bought asset {} for {} {}",
            listing.asset_id, listing.price_amount, token_symbol
        )),
    };
    if let Err(err) = apply_balance_change(&db, &buyer_id_hex, &buyer_adjustment).await {
        revert_listing_to_active(&listings_collection, &listing_oid).await;
        return Err(err);
    }

    let seller_adjustment = AdjustBalanceRequest {
        token_symbol: token_symbol.clone(),
        available_delta: seller_payout,
        locked_delta: Some(0),
        reference_type: Some("market_sale".to_string()),
        reference_id: Some(listing_oid.to_hex()),
        notes: Some(format!(
            "Sold asset {} for {} {} (fee {})",
            listing.asset_id, seller_payout, token_symbol, fee_amount
        )),
    };
    if let Err(err) = apply_balance_change(&db, &listing.seller_id, &seller_adjustment).await {
        revert_listing_to_active(&listings_collection, &listing_oid).await;
        return Err(err);
    }

    let treasury_account = platform_treasury_account();
    if fee_amount > 0 {
        let treasury_adjustment = AdjustBalanceRequest {
            token_symbol: token_symbol.clone(),
            available_delta: fee_amount,
            locked_delta: Some(0),
            reference_type: Some("market_fee".to_string()),
            reference_id: Some(listing_oid.to_hex()),
            notes: Some(format!(
                "Marketplace fee for asset {} trade",
                listing.asset_id
            )),
        };
        let _ = apply_balance_change(&db, &treasury_account, &treasury_adjustment).await;
    }

    let executed_at = DateTime::now();
    let asset_update = assets_collection
        .update_one(
            doc! {
                "_id": &listing.asset_id,
                "owner_id": &listing.seller_id,
                "status": to_bson(&AssetStatus::Listed).expect("serialize asset status")
            },
            doc! {
                "$set": {
                    "owner_id": &recipient_id,
                    "is_locked": false,
                    "status": to_bson(&AssetStatus::Active).expect("serialize asset status"),
                    "updated_at": executed_at
                }
            },
        )
        .await
        .map_err(internal_error)?;

    if asset_update.modified_count == 0 {
        revert_listing_to_active(&listings_collection, &listing_oid).await;
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Asset state conflict"})),
        ));
    }

    let listing_update = listings_collection
        .update_one(
            doc! {
                "_id": &listing_oid,
                "status": to_bson(&ListingStatus::Escrow).expect("serialize listing status")
            },
            doc! {
                "$set": {
                    "status": to_bson(&ListingStatus::Filled).expect("serialize listing status"),
                    "buyer_id": &buyer_id_hex,
                    "filled_at": executed_at,
                    "updated_at": executed_at
                }
            },
        )
        .await
        .map_err(internal_error)?;

    if listing_update.modified_count == 0 {
        revert_listing_to_active(&listings_collection, &listing_oid).await;
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Listing state conflict"})),
        ));
    }

    let mut receipt = TradeReceipt {
        id: None,
        listing_id: listing_oid,
        asset_id: listing.asset_id,
        seller_id: listing.seller_id.clone(),
        buyer_id: buyer_id_hex.clone(),
        price_token: token_symbol.clone(),
        price_amount: listing.price_amount,
        fee_bps: listing.fee_bps,
        fee_amount,
        seller_payout,
        executed_at,
    };

    let insert_receipt = receipts_collection
        .insert_one(&receipt)
        .await
        .map_err(internal_error)?;

    if let Some(id) = insert_receipt.inserted_id.as_object_id() {
        receipt.id = Some(id);
    }

    Ok((StatusCode::CREATED, Json(receipt)))
}

#[utoipa::path(
    delete,
    path = "/economy/marketplace/listings/{listing_id}",
    params(
        ("listing_id" = String, Path, description = "Listing ID")
    ),
    responses(
        (status = 200, description = "Listing cancelled"),
        (status = 400, description = "Cannot cancel listing")
    ),
    tag = "economy"
)]
pub async fn cancel_listing(
    State(db): State<Database>,
    Path(listing_id): Path<String>,
    headers: HeaderMap,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let listings_collection: Collection<AssetListing> = db.collection("asset_listings");
    let assets_collection: Collection<Asset> = db.collection("assets");

    let listing_oid = ObjectId::parse_str(&listing_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid listing id"})),
        )
    })?;

    let auth_user = get_authenticated_user(&db, &headers)
        .await
        .map_err(|err| err)?;
    let seller_oid = auth_user
        .id
        .ok_or_else(|| internal_error("Authenticated user is missing an id"))?;
    let seller_id_hex = seller_oid.to_hex();

    let listing = listings_collection
        .find_one(doc! { "_id": &listing_oid })
        .await
        .map_err(internal_error)?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Listing not found"})),
            )
        })?;

    if listing.seller_id != seller_id_hex {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Only the seller can cancel a listing"})),
        ));
    }

    if listing.status != ListingStatus::Active {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Listing not active"})),
        ));
    }

    let asset_update = assets_collection
        .update_one(
            doc! {
                "_id": &listing.asset_id,
                "owner_id": &seller_id_hex,
                "status": to_bson(&AssetStatus::Listed).expect("serialize asset status")
            },
            doc! {
                "$set": {
                    "is_locked": false,
                    "status": to_bson(&AssetStatus::Active).expect("serialize asset status"),
                    "updated_at": DateTime::now()
                }
            },
        )
        .await
        .map_err(internal_error)?;

    if asset_update.modified_count == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Asset state conflict"})),
        ));
    }

    listings_collection
        .update_one(
            doc! {
                "_id": &listing_oid,
                "status": to_bson(&ListingStatus::Active).expect("serialize listing status"),
                "seller_id": &seller_id_hex
            },
            doc! {
                "$set": {
                    "status": to_bson(&ListingStatus::Cancelled).expect("serialize listing status"),
                    "updated_at": DateTime::now()
                }
            },
        )
        .await
        .map_err(internal_error)?;

    Ok(StatusCode::OK)
}

// Helpers ---------------------------------------------------------------------

pub(crate) async fn maybe_bootstrap_balances(
    collection: &Collection<TokenBalance>,
    user_id: &str,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let existing = collection
        .count_documents(doc! { "user_id": user_id })
        .await
        .map_err(internal_error)?;

    if existing > 0 {
        return Ok(());
    }

    let defaults = vec![
        default_balance(user_id, "DOOLER", 25_000),
        default_balance(user_id, "USDC", 5_000),
        default_balance(user_id, "BLING", 12_500),
        default_balance(user_id, "SOL", 250),
    ];

    collection
        .insert_many(defaults)
        .await
        .map_err(internal_error)?;

    Ok(())
}

async fn maybe_bootstrap_shop_items(
    collection: &Collection<ShopItem>,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let existing = collection
        .count_documents(doc! {})
        .await
        .map_err(internal_error)?;

    if existing > 0 {
        return Ok(());
    }

    let defaults = vec![
        default_shop_item(
            "Infernal Megaphone",
            "Amplify your evil tweets with a guaranteed engagement surge.",
            "tool",
            json!({ "impact": 75, "rarity": "epic" }),
            250,
            50,
        ),
        default_shop_item(
            "Shadow Cloak",
            "Hide from moderation bots for 24 hours.",
            "collectible",
            json!({ "stealth": 100, "rarity": "rare" }),
            120,
            100,
        ),
        default_shop_item(
            "Bot Army Bundle",
            "Deploy 1,000 obedient reply bots to swarm your foes.",
            "reward",
            json!({ "bots": 1000, "rarity": "legendary" }),
            500,
            25,
        ),
    ];

    collection
        .insert_many(defaults)
        .await
        .map_err(internal_error)?;

    Ok(())
}

pub(crate) fn default_balance(user_id: &str, token: &str, amount: i64) -> TokenBalance {
    let now = DateTime::now();
    TokenBalance {
        id: None,
        user_id: user_id.to_string(),
        token_symbol: token.to_string(),
        available: amount,
        locked: 0,
        created_at: now,
        updated_at: now,
    }
}

fn default_shop_item(
    name: &str,
    description: &str,
    blueprint: &str,
    attributes: serde_json::Value,
    price_amount: i64,
    supply: i64,
) -> ShopItem {
    let now = DateTime::now();
    ShopItem {
        id: None,
        name: name.to_string(),
        description: Some(description.to_string()),
        media_url: None,
        asset_blueprint: blueprint.to_string(),
        asset_attributes: Some(attributes),
        price_token: "USDC".to_string(),
        price_amount,
        total_supply: Some(supply),
        remaining_supply: Some(supply),
        is_active: true,
        created_at: now,
        updated_at: now,
    }
}

async fn revert_listing_to_active(listings: &Collection<AssetListing>, listing_id: &ObjectId) {
    let _ = listings
        .update_one(
            doc! {
                "_id": listing_id,
                "status": to_bson(&ListingStatus::Escrow).expect("serialize listing status")
            },
            doc! {
                "$set": {
                    "status": to_bson(&ListingStatus::Active).expect("serialize listing status"),
                    "updated_at": DateTime::now()
                },
                "$unset": { "buyer_id": "", "filled_at": "" }
            },
        )
        .await;
}

fn internal_error<E>(err: E) -> (StatusCode, Json<serde_json::Value>)
where
    E: std::fmt::Display,
{
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({ "error": err.to_string() })),
    )
}

fn platform_treasury_account() -> String {
    std::env::var("PLATFORM_TREASURY_ACCOUNT").unwrap_or_else(|_| "treasury".to_string())
}

// String conversions for enums (Mongo needs string when storing enums as text)
impl ToString for AssetStatus {
    fn to_string(&self) -> String {
        match self {
            AssetStatus::Active => "active",
            AssetStatus::Listed => "listed",
            AssetStatus::Locked => "locked",
            AssetStatus::Burned => "burned",
        }
        .to_string()
    }
}

impl ToString for ListingStatus {
    fn to_string(&self) -> String {
        match self {
            ListingStatus::Active => "active",
            ListingStatus::Escrow => "escrow",
            ListingStatus::Filled => "filled",
            ListingStatus::Cancelled => "cancelled",
            ListingStatus::Expired => "expired",
        }
        .to_string()
    }
}
