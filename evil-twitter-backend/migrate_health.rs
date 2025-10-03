use mongodb::{Client, bson::doc};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenvy::dotenv().ok();

    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");

    // Connect to MongoDB
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);
    let collection = db.collection("tweets");

    println!("Starting migration to add health field to existing tweets...");

    // Update all tweets that don't have a health field to have health: 100
    let result = collection
        .update_many(
            doc! { "health": { "$exists": false } },
            doc! { "$set": { "health": 100 } },
        )
        .await?;

    println!("Migration completed!");
    println!("Matched {} tweets", result.matched_count);
    println!("Modified {} tweets", result.modified_count);

    Ok(())
}
