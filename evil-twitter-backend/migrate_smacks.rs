use dotenvy::dotenv;
use mongodb::bson::{Document, doc};
use mongodb::{Client, Collection};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env file
    dotenv().ok();

    println!("Starting smacks migration...");

    let mongo_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");

    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);
    let collection: Collection<Document> = db.collection("tweets");

    // Find all tweets that don't have metrics.smacks field
    let filter = doc! {
        "$or": [
            { "metrics.smacks": { "$exists": false } },
            { "metrics": { "$exists": false } }
        ]
    };

    let update = doc! {
        "$set": {
            "metrics.smacks": 0
        }
    };

    // Use update_many with upsert: false to only update existing documents
    let result = collection.update_many(filter, update).await?;

    println!("✅ Migration complete!");
    println!("   Updated {} tweets with smacks: 0", result.modified_count);
    println!("   Matched {} tweets", result.matched_count);

    // Also ensure all tweets have metrics object
    let filter_no_metrics = doc! {
        "metrics": { "$exists": false }
    };

    let update_metrics = doc! {
        "$set": {
            "metrics": {
                "likes": 0,
                "retweets": 0,
                "quotes": 0,
                "replies": 0,
                "impressions": 0,
                "smacks": 0
            }
        }
    };

    let result2 = collection
        .update_many(filter_no_metrics, update_metrics)
        .await?;

    println!(
        "   Updated {} tweets with full metrics object",
        result2.modified_count
    );

    Ok(())
}
