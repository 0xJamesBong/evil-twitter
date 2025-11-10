Great—let’s lock this to **Transaction** (double-entry), wire it through your shop + asset flows, and show exactly which files you need, what goes in them, and how to adjust your current files.

I’ll keep this tight, production-lean, and integer-only.

---

# File map (new & changed)

```
src/
├── models/
│   ├── accounting/
│   │   ├── accounts.rs            # NEW: LedgerAccount enum & helpers
│   │   ├── transaction.rs         # NEW: Transaction + TransactionEntry (+ enums)
│   │   └── pricing_snapshot.rs    # NEW: snapshot structs for valuations (optional)
│   ├── assets/
│   │   ├── asset.rs               # MODIFY: no business logic; pure data (yours)
│   │   ├── catalogItem.rs         # MODIFY: price type + helpers
│   │   ├── enums.rs               # MODIFY: TokenType → decimals(), symbol()
│   │   ├── token_balance.rs       # MODIFY: i128, timestamps, indexes
│   │   └── token_ledger.rs        # **DEPRECATE** (replaced by Transaction)
│   └── ...
├── routes/
│   ├── balance.rs                 # MODIFY: quote + buy via Transaction posting
│   ├── shop.rs                    # MODIFY: buy_item via Transaction posting
│   └── ...
├── services/
│   ├── transactions.rs            # NEW: post_transaction() w/ Mongo session
│   ├── idempotency.rs             # NEW: load_or_create_by_key()
│   └── quotes.rs                  # NEW: quote lifecycle (create/verify/bind)
├── db/
│   ├── indexes.rs                 # NEW: ensure indexes on startup
│   └── migrations/001_drop_legacy_token_ledger.json  # NEW: optional migration doc
└── main.rs                        # MODIFY: wire new routes + ensure_indexes()
```

---

# Core model: double-entry **Transaction**

## `models/accounting/accounts.rs` (NEW)

```rust
use crate::models::assets::enums::TokenType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "kind", content = "data")]
pub enum LedgerAccount {
    Token(TokenType),           // affects TokenBalance (native units)
    Revenue(&'static str),      // e.g., "ShopSales", "ShopFees" (valuation only)
    Liability(&'static str),    // e.g., "UnsettledDeposits"
    Seigniorage(TokenType),     // issuance/sink for internal tokens (valuation only)
    // Add others as needed: Expense(...), Inventory(...), etc.
}

impl LedgerAccount {
    pub fn is_token(&self) -> bool {
        matches!(self, LedgerAccount::Token(_))
    }
}
```

## `models/accounting/transaction.rs` (NEW)

```rust
use super::accounts::LedgerAccount;
use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TransactionKind {
    TokenPurchase,    // buy DOOLER/BLING/SOL with USDC
    CatalogBuy,       // buy an Asset item with USDC/DOOLER/etc.
    Airdrop,
    Refund,
    Reversal,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TransactionStatus {
    Pending,
    Posted,
    Reversed,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TransactionEntry {
    pub account: LedgerAccount,
    /// Native units for Token(...) accounts; 0 for non-token accounts
    pub delta: i128,
    pub memo: Option<String>,
    /// Snapshot valuation in micro-USDC (required for all entries).
    pub valuation_usdc: i128,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Transaction {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub user_id: ObjectId,
    pub kind: TransactionKind,
    pub status: TransactionStatus,

    /// For idempotency (client-supplied)
    pub idempotency_key: String,

    /// For quotes, payment intents, external order IDs, etc.
    pub external_ref: Option<String>,

    pub entries: Vec<TransactionEntry>, // must sum(valuation_usdc) == 0

    pub created_at: DateTime,
    pub posted_at: Option<DateTime>,
    /// If this is a reversal, points to the original
    pub reverses: Option<ObjectId>,
}
```

---

# Posting logic (atomic, conditional, idempotent)

## `services/transactions.rs` (NEW)

```rust
use crate::models::accounting::transaction::*;
use crate::models::accounting::accounts::LedgerAccount;
use crate::models::assets::token_balance::TokenBalance;
use crate::models::assets::enums::TokenType;
use anyhow::{anyhow, Result};
use mongodb::{
    bson::{doc, to_bson, DateTime},
    Client, Database, Collection, options::WriteConcern, ClientSession,
};
use uuid::Uuid;

pub struct TransactionPoster {
    db: Database,
}

impl TransactionPoster {
    pub fn new(db: Database) -> Self { Self { db } }

    /// Atomically validates and posts a transaction.
    /// - Enforces sum(valuation_usdc) == 0
    /// - Conditionally prevents negative balances
    /// - Idempotent on (user_id, idempotency_key)
    pub async fn post(&self, mut tx: Transaction) -> Result<Transaction> {
        let transactions: Collection<Transaction> = self.db.collection("transactions");
        let balances: Collection<TokenBalance> = self.db.collection("token_balances");

        // Idempotency: return existing if same (user, key)
        if let Some(existing) = transactions
            .find_one(doc! {
                "user_id": &tx.user_id,
                "idempotency_key": &tx.idempotency_key
            }, None).await? {
            return Ok(existing);
        }

        // Validate: valuation must net zero
        let net: i128 = tx.entries.iter().map(|e| e.valuation_usdc).sum();
        if net != 0 { return Err(anyhow!("Transaction not balanced in valuation_usdc")); }

        tx.created_at = DateTime::now();
        tx.status = TransactionStatus::Pending;

        let mut session = self.db.client().start_session(None).await?;
        session.start_transaction(None).await?;

        // Insert as Pending first (so idempotency is guaranteed within txn)
        let insert = transactions.insert_one_with_session(&tx, None, &mut session).await?;
        let tx_id = insert.inserted_id.as_object_id().unwrap();

        // Apply to balances for Token(...) accounts using conditional updates
        for entry in &tx.entries {
            if let LedgerAccount::Token(token) = &entry.account {
                if entry.delta < 0 {
                    // Guarded decrement: only if amount >= |delta|
                    let need = (-entry.delta) as i128;
                    let filter = doc! {
                        "user_id": &tx.user_id,
                        "token": to_bson(token)?,
                        "amount": { "$gte": need },
                    };
                    let update = doc! {
                        "$inc": { "amount": entry.delta },
                        "$set": { "updated_at": DateTime::now() },
                        "$setOnInsert": {
                            "user_id": &tx.user_id,
                            "token": to_bson(token)?,
                            "amount": 0_i128,
                            "created_at": DateTime::now(),
                        }
                    };
                    let res = balances.update_one_with_session(filter, update, None, &mut session).await?;
                    if res.matched_count == 0 {
                        session.abort_transaction().await?;
                        return Err(anyhow!("Insufficient balance for {:?}", token));
                    }
                } else if entry.delta > 0 {
                    // Upsert increment
                    let filter = doc! {
                        "user_id": &tx.user_id,
                        "token": to_bson(token)?,
                    };
                    let update = doc! {
                        "$inc": { "amount": entry.delta },
                        "$set": { "updated_at": DateTime::now() },
                        "$setOnInsert": {
                            "user_id": &tx.user_id,
                            "token": to_bson(token)?,
                            "amount": 0_i128,
                            "created_at": DateTime::now(),
                        }
                    };
                    balances.update_one_with_session(filter, update, None, &mut session).await?;
                }
            }
        }

        // Mark Posted
        transactions.update_one_with_session(
            doc! { "_id": &tx_id },
            doc! { "$set": { "status": to_bson(&TransactionStatus::Posted)?, "posted_at": DateTime::now() } },
            None,
            &mut session
        ).await?;

        session.commit_transaction().await?;

        // Return the posted record
        Ok(transactions.find_one(doc! { "_id": &tx_id }, None).await?.unwrap())
    }
}
```

---

# Quotes & idempotency

## `services/quotes.rs` (NEW – minimal)

```rust
use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quote {
    pub quote_id: String,            // UUID
    pub user_id: ObjectId,
    pub token_type: String,          // "Dooler" | "Bling" | ...
    pub amount_requested: i128,      // native units
    pub usdc_cost: i128,             // micro-USDC
    pub tokens_out_exact: i128,      // native units after fees
    pub pricing_version: i32,
    pub expires_at: DateTime,
    pub created_at: DateTime,
}

// You can persist quotes in "quotes" collection, TTL index on expires_at.
```

---

# Minimal pricing (integer-only)

Keep your **predatory** vibe but avoid floats.

## `models/accounting/pricing_snapshot.rs` (NEW – optional)

```rust
use crate::models::assets::enums::TokenType;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceSnapshot {
    pub token: TokenType,
    pub unit_price_usdc_micro: i128, // e.g., SOL oracle * 1_000_000
    pub markup_bps: i32,             // e.g., 1000 = 10%
}
```

Use fixed exponents for fees (lookup tables) or piecewise linear curves to stay integer-only.

---

# Changes to your existing files

## 1) `assets/enums.rs` (MODIFY)

Add decimals + symbol. (Also useful for display & conversions.)

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TokenType { Dooler, Usdc, Sol, Bling }

impl TokenType {
    pub fn decimals(&self) -> u32 {
        match self {
            TokenType::Dooler => 3,   // example: 1 DOOLER = 1000 subunits
            TokenType::Usdc   => 6,
            TokenType::Sol    => 9,
            TokenType::Bling  => 0,   // “integer flex” or pick what you want
        }
    }
    pub fn symbol(&self) -> &'static str {
        match self {
            TokenType::Dooler => "DOOLER",
            TokenType::Usdc   => "USDC",
            TokenType::Sol    => "SOL",
            TokenType::Bling  => "BLING",
        }
    }
}
```

_No breaking change for `Item`/`ItemTypeMetadata`._

---

## 2) `assets/token_balance.rs` (MODIFY)

Switch to **i128** + timestamps and wire `_id` + unique index.

```rust
use crate::models::assets::enums::TokenType;
use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct TokenBalance {
    #[serde(rename="_id", skip_serializing_if="Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub token: TokenType,
    pub amount: i128,          // native smallest units
    pub created_at: DateTime,
    pub updated_at: DateTime,
}
```

**DB index (ensure at startup):**

```rust
// db/indexes.rs
use mongodb::{Database, bson::doc, options::{IndexOptions, IndexModel}};
pub async fn ensure_indexes(db: &Database) {
    let balances = db.collection::<mongodb::bson::Document>("token_balances");
    let unique = IndexModel::builder()
        .keys(doc!{ "user_id": 1, "token": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();
    let user_idx = IndexModel::builder().keys(doc!{ "user_id": 1 }).build();
    let ts_idx   = IndexModel::builder().keys(doc!{ "updated_at": -1 }).build();
    let _ = balances.create_indexes(vec![unique, user_idx, ts_idx], None).await;

    let txs = db.collection::<mongodb::bson::Document>("transactions");
    let idem = IndexModel::builder()
        .keys(doc!{ "user_id": 1, "idempotency_key": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();
    let _ = txs.create_indexes(vec![idem], None).await;
}
```

---

## 3) `assets/token_ledger.rs` (DEPRECATE)

Replace this file with a stub that re-exports `Transaction` (temporarily) or remove usages:

```rust
// DEPRECATED: Use models/accounting/transaction.rs
```

(If you need historical migration: write a one-off that wraps each old TokenLedgerEntry into a single-entry Transaction with valuation_usdc=0 and kind=Airdrop.)

---

## 4) `assets/catalogItem.rs` (MODIFY)

- Make `price` an **i128** (micro-USDC).
- Add a helper to return `price_usdc_micro()`.

```rust
use crate::models::assets::enums::{Item, ItemTypeMetadata, ToolMetadata};
use crate::models::tool::{ToolTarget, ToolType};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct CatalogItem {
    pub catalog_id: String,
    pub item: Option<Item>,
    /// Canonical price in micro-USDC
    pub price: i128,
}

impl CatalogItem {
    pub fn price_usdc_micro(&self) -> i128 { self.price }
}

// (Catalog list unchanged except: change price literals to i128)
```

_(Your examples like `price: 1000` stay valid: they’re inferred as `i32`; add `1000i128` or cast.)_

---

## 5) `assets/asset.rs` (KEEP structure; no business logic inside)

Your struct is fine. Buying an asset will be handled via **Transaction** in `routes/shop.rs`, and **then** you persist the `Asset` document.

No schema change required here.

---

# Route changes: use **Transaction** instead of “update_balance”

## `routes/balance.rs` (MODIFY – token shop)

Flow: **quote → execute** with idempotency.

```rust
use axum::{extract::{Path, State}, Json};
use mongodb::bson::{oid::ObjectId, DateTime};
use uuid::Uuid;

use crate::models::accounting::transaction::*;
use crate::models::accounting::accounts::LedgerAccount;
use crate::models::assets::enums::TokenType;
use crate::services::{transactions::TransactionPoster, quotes::Quote};

#[derive(serde::Deserialize)]
pub struct QuoteRequest { pub token_type: TokenType, pub amount: i128 }

#[derive(serde::Serialize)]
pub struct QuoteResponse {
    pub quote_id: String,
    pub usdc_cost: i128,
    pub tokens_out_exact: i128,
    pub expires_at: DateTime,
    pub pricing_version: i32,
}

pub async fn get_buy_quote(
    State(db): State<mongodb::Database>,
    Json(req): Json<QuoteRequest>,
) -> Result<Json<QuoteResponse>, String> {
    // Integer-only pricing; fill these from your pricing module.
    let pricing_version = 1;
    // Example DOOLER quote: 1000 DOOLER costs 25_000 micro-USDC and yields 850 DOOLER
    let (usdc_cost, tokens_out_exact) = quote_price_for(req.token_type.clone(), req.amount)?;

    let resp = QuoteResponse {
        quote_id: Uuid::new_v4().to_string(),
        usdc_cost,
        tokens_out_exact,
        expires_at: DateTime::from_millis(DateTime::now().to_chrono().timestamp_millis() + 60_000),
        pricing_version,
    };
    // Optionally persist Quote for later verification.
    Ok(Json(resp))
}

#[derive(serde::Deserialize)]
pub struct ExecuteRequest {
    pub quote_id: String,
    pub token_type: TokenType,
    pub amount_requested: i128,
    pub usdc_cost: i128,
    pub tokens_out_exact: i128,
    pub idempotency_key: String,
}

pub async fn buy_tokens(
    State(db): State<mongodb::Database>,
    Path(user_id): Path<String>,
    Json(req): Json<ExecuteRequest>,
) -> Result<Json<Transaction>, String> {
    let poster = TransactionPoster::new(db.clone());
    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| "bad user id")?;

    // (Optional) verify quote_id against stored Quote; here we trust payload.

    let tx = Transaction {
        id: None,
        user_id: user_oid,
        kind: TransactionKind::TokenPurchase,
        status: TransactionStatus::Pending,
        idempotency_key: req.idempotency_key.clone(),
        external_ref: Some(req.quote_id.clone()),
        created_at: DateTime::now(),
        posted_at: None,
        reverses: None,
        entries: vec![
            // Spend USDC
            TransactionEntry {
                account: LedgerAccount::Token(TokenType::Usdc),
                delta: -req.usdc_cost,                // micro-USDC
                memo: Some("USDC spent in token purchase".into()),
                valuation_usdc: -req.usdc_cost,
            },
            // Receive requested token (native units)
            TransactionEntry {
                account: LedgerAccount::Token(req.token_type.clone()),
                delta:  req.tokens_out_exact,         // native units
                memo: Some("Tokens received from shop".into()),
                // value those tokens at shop’s “internal mark” (e.g., full usdc_cost)
                valuation_usdc: req.usdc_cost,
            },
            // If you want to show fees/revenue explicitly, split valuation between token and revenue.
            // Simpler MVP: the two above already net to 0 valuation.
        ],
    };

    let posted = poster.post(tx).await.map_err(|e| e.to_string())?;
    Ok(Json(posted))
}

// Dummy pricing for example
fn quote_price_for(token: TokenType, amount: i128) -> Result<(i128, i128), String> {
    match token {
        TokenType::Dooler => Ok((25_000, 850)), // costs 0.025 USDC, yields 850 DOOLER
        TokenType::Bling  => Ok((100_000_000, 1)), // 100 USDC per 1 BLING
        TokenType::Sol    => Ok((880_000_000, 10)), // 10 SOL @ 80USDC +10% markup (dummy)
        TokenType::Usdc   => Err("Cannot buy USDC with USDC".into()),
    }
}
```

> Note: If you want explicit **ShopFees** revenue, add a third entry in the same transaction:
>
> - TokenOut valued at (usdc_cost – fees)
> - Revenue("ShopFees") valued at +fees (with `delta=0`, valuation only).
>   Sum(valuation_usdc) still 0.

---

## `routes/shop.rs` (MODIFY – buy asset)

Replace direct balance mutation with a **Transaction**. After posting, persist the `Asset`.

```rust
pub async fn buy_item(
    State(db): State<mongodb::Database>,
    Path(user_id): Path<String>,
    Json(payload): Json<BuyItemRequest>,
) -> Result<(StatusCode, Json<Asset>), String> {
    let user_oid = ObjectId::parse_str(&user_id).map_err(|_| "bad user id")?;
    let poster = TransactionPoster::new(db.clone());

    let catalog = get_catalog_item_by_id(&payload.catalog_id).ok_or("not found")?;
    let price_usdc = catalog.price_usdc_micro();

    let tx = Transaction {
        id: None,
        user_id: user_oid,
        kind: TransactionKind::CatalogBuy,
        status: TransactionStatus::Pending,
        idempotency_key: payload.idempotency_key.clone(),
        external_ref: Some(catalog.catalog_id.clone()),
        created_at: DateTime::now(),
        posted_at: None,
        reverses: None,
        entries: vec![
            TransactionEntry {
                account: LedgerAccount::Token(TokenType::Usdc),
                delta: -price_usdc,
                memo: Some(format!("Buy {}", catalog.catalog_id)),
                valuation_usdc: -price_usdc,
            },
            TransactionEntry {
                account: LedgerAccount::Revenue("ShopSales"),
                delta: 0,
                memo: Some("Item sale".into()),
                valuation_usdc: price_usdc,
            },
        ],
    };

    let _posted = poster.post(tx).await.map_err(|e| e.to_string())?;

    // Only after Posted do we mint the Asset doc
    let asset = AssetBuilder::new(user_id.clone()).item(catalog.item.unwrap()).build();
    let assets: Collection<Asset> = db.collection("assets");
    assets.insert_one(&asset, None).await.map_err(|e| e.to_string())?;

    Ok((StatusCode::CREATED, Json(asset)))
}
```

---

# API tweaks (summary)

- `POST /token-shop/quote` → `{quote_id, usdc_cost, tokens_out_exact, expires_at, pricing_version}`
- `POST /users/{id}/tokens/buy` → `{quote_id, token_type, amount_requested, usdc_cost, tokens_out_exact, idempotency_key}`
- `GET /users/{id}/balances`
- `GET /users/{id}/transactions?token=USDC&limit=50&before=...`

---

# Why this satisfies your brief

- **Called “Transaction”** as requested.
- **Double-entry**: every operation is a single Transaction with entries that **net to zero valuation**; Token balances move only on Token accounts; Revenue/Seigniorage are recorded by valuation.
- **Atomic**: Mongo session transaction applies or fails as a unit.
- **Idempotent**: (user_id, idempotency_key) unique index.
- **No floats**: all ints (`i128`) and micro-USDC valuation.

---

# Quick edits you asked for (line-item)

- `asset.rs`: **no change** needed for double-entry; asset minting happens _after_ a successful Transaction post.
- `catalogItem.rs`: change `price: i32` → `price: i128`; keep content otherwise.
- `enums.rs`: add `decimals()` and `symbol()` on `TokenType` (shown).
- `tokenBalances.rs`: change `amount: i64` → `i128`, add `_id`, `created_at`, `updated_at`; enforce unique index `(user_id, token)`.
- `tokenLedger.rs`: **remove/retire**; use `transactions` collection with the schema above.

If you want, I can also drop in:

- a tiny `reversal_of(tx_id)` helper that creates compensating entries,
- a reconciliation job that recomputes TokenBalance from Transactions and asserts zero drift,
- and a DB migration snippet to lift existing balances/ledgers into the new shape.
