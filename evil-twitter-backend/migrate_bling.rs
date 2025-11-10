use dotenvy::dotenv;
use futures::TryStreamExt;
use mongodb::bson::{Document, doc};
use mongodb::{Client, Collection};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file
    dotenv().ok();

    println!("Starting BLING migration...");

    let mongo_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");

    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);
    let users_collection: Collection<Document> = db.collection("users");
    let token_balance_collection: Collection<Document> = db.collection("token_balances");

    // Get all users
    let mut cursor = users_collection.find(doc! {}).await?;
    let mut updated_count = 0;
    let mut created_count = 0;

    while let Some(user) = cursor.try_next().await? {
        let user_id = user.get_object_id("_id")?;

        // Check if user already has BLING balance
        let bling_filter = doc! {
            "user_id": user_id,
            "token": "Bling"
        };

        let existing_balance = token_balance_collection
            .find_one(bling_filter.clone())
            .await?;

        if existing_balance.is_some() {
            // Update existing balance to 10k if it's less
            let current_amount = existing_balance
                .as_ref()
                .unwrap()
                .get_i64("amount")
                .unwrap_or(0);

            if current_amount < 10_000 {
                token_balance_collection
                    .update_one(
                        bling_filter,
                        doc! {
                            "$set": {
                                "amount": 10_000_i64
                            }
                        },
                    )
                    .await?;
                updated_count += 1;
                println!("  ✅ Updated user {} BLING balance to 10k", user_id);
            } else {
                println!(
                    "  ⏭️  User {} already has {} BLING (>= 10k)",
                    user_id, current_amount
                );
            }
        } else {
            // Create new BLING balance with 10k
            let new_balance = doc! {
                "user_id": user_id,
                "token": "Bling",
                "amount": 10_000_i64
            };

            token_balance_collection.insert_one(new_balance).await?;
            created_count += 1;
            println!("  ✅ Created 10k BLING balance for user {}", user_id);
        }
    }

    println!("\n✅ Migration complete!");
    println!("   Created {} new BLING balances", created_count);
    println!("   Updated {} existing BLING balances", updated_count);
    println!(
        "   Total users processed: {}",
        created_count + updated_count
    );

    Ok(())
}
