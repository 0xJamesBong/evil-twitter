use std::sync::Arc;
use std::time::Duration;

use dotenvy::dotenv;
use hex;
use mongodb::{Client, bson::doc};
use tokio::time::sleep;

use evil_twitter::{
    app,
    app_state::{AppState, VoteBufferKey},
    models::post_state::PostState,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("Starting Evil Twitter API...");

    dotenv().ok(); // load .env
    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);

    // Create application state (includes services and database)
    let app_state = Arc::new(AppState::new(client, db));

    // Ensure database indexes are created
    println!("Creating database indexes...");
    if let Err(e) = app_state.mongo_service.users.ensure_indexes().await {
        eprintln!("Warning: Failed to create user indexes: {:?}", e);
    }
    if let Err(e) = app_state.mongo_service.profiles.ensure_indexes().await {
        eprintln!("Warning: Failed to create profile indexes: {:?}", e);
    }
    println!("Database indexes ready");

    // Spawn background task to flush vote buffer
    let app_state_for_flush = app_state.clone();
    tokio::spawn(async move {
        vote_flush_loop(app_state_for_flush).await;
    });
    println!("✅ Vote flush task started");

    let app = app(app_state.clone()).await;

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string()) // default for local dev
        .parse::<u16>()
        .expect("PORT must be a number");
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("🚀 Evil Twitter API listening on http://{}", addr);
    println!("📚 Swagger UI available at http://{}/doc", addr);

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

/// Background task that periodically flushes accumulated votes to Solana
async fn vote_flush_loop(app_state: Arc<AppState>) {
    // Get batch interval from env var, default to 200ms
    let interval_ms = std::env::var("VOTE_BATCH_INTERVAL_MS")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(200);

    println!(
        "🔄 Vote flush loop started with interval: {}ms",
        interval_ms
    );

    loop {
        sleep(Duration::from_millis(interval_ms)).await;

        // Collect entries to flush (to avoid holding lock during async operations)
        let entries_to_flush: Vec<(VoteBufferKey, u64)> = {
            let mut buffer = match app_state.vote_buffer.lock() {
                Ok(b) => b,
                Err(e) => {
                    eprintln!("❌ Failed to lock vote buffer: {}", e);
                    continue;
                }
            };

            // Collect all entries with votes > 0 and remove them from buffer
            let mut entries = Vec::new();
            let keys: Vec<VoteBufferKey> = buffer
                .iter()
                .filter_map(|(key, value)| {
                    if value.accumulated_votes > 0 {
                        Some(key.clone())
                    } else {
                        None
                    }
                })
                .collect();

            for key in keys {
                if let Some(value) = buffer.remove(&key) {
                    entries.push((key, value.accumulated_votes));
                }
            }

            entries
        };

        // Flush each entry
        for (key, votes) in entries_to_flush {
            let result = app_state
                .solana_service
                .vote_on_post(
                    &key.user,
                    key.post_id_hash,
                    key.side,
                    &key.token_mint,
                    votes,
                )
                .await;

            match result {
                Ok(signature) => {
                    eprintln!(
                        "✅ Flushed {} votes for user {} on post {}: {}",
                        votes,
                        key.user,
                        hex::encode(key.post_id_hash),
                        signature
                    );

                    // Invalidate MongoDB cache for this post so next query fetches fresh data
                    let post_id_hash_hex = hex::encode(key.post_id_hash);
                    let post_states_collection = app_state
                        .mongo_service
                        .db()
                        .collection::<PostState>(PostState::COLLECTION_NAME);

                    if let Err(e) = post_states_collection
                        .delete_one(doc! { "post_id_hash": &post_id_hash_hex })
                        .await
                    {
                        eprintln!(
                            "⚠️ Failed to invalidate cache for post {}: {}",
                            post_id_hash_hex, e
                        );
                    } else {
                        eprintln!("🔄 Invalidated cache for post {}", post_id_hash_hex);
                    }
                }
                Err(e) => {
                    eprintln!(
                        "❌ Failed to flush {} votes for user {} on post {}: {}",
                        votes,
                        key.user,
                        hex::encode(key.post_id_hash),
                        e
                    );
                    // Votes are lost - user can retry by clicking again
                }
            }
        }
    }
}
