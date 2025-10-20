use mongodb::{
    Client,
    bson::{doc, oid::ObjectId},
};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenvy::dotenv().ok();

    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");

    // Connect to MongoDB
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);
    let users_collection = db.collection("users");
    let tweets_collection = db.collection("tweets");
    let follows_collection = db.collection("follows");

    println!("Starting migration to fix duplicate user ObjectIds...");

    // The problematic ObjectId that all users share
    let problematic_id = ObjectId::parse_str("68d9b685550f1355d0f01ba4")?;

    // Find all users with the problematic ObjectId
    let cursor = users_collection.find(doc! {"_id": problematic_id}).await?;
    let users: Vec<mongodb::bson::Document> = cursor.try_collect().await?;

    println!(
        "Found {} users with duplicate ObjectId: {}",
        users.len(),
        problematic_id
    );

    if users.is_empty() {
        println!("No users found with the problematic ObjectId. Migration not needed.");
        return Ok(());
    }

    // Create a mapping from old ObjectId to new ObjectId for each user
    let mut id_mapping: HashMap<ObjectId, ObjectId> = HashMap::new();
    let mut user_updates = Vec::new();

    for (index, user_doc) in users.iter().enumerate() {
        let supabase_id = user_doc.get_str("supabase_id")?;
        let username = user_doc.get_str("username")?;

        // Generate a new unique ObjectId
        let new_id = ObjectId::new();
        id_mapping.insert(problematic_id, new_id);

        println!(
            "User {} ({}): {} -> {}",
            index + 1,
            username,
            supabase_id,
            new_id
        );

        // Prepare update for this user
        user_updates.push((
            problematic_id,
            new_id,
            supabase_id.to_string(),
            username.to_string(),
        ));
    }

    println!("\nUpdating users with new ObjectIds...");

    // Update each user with their new ObjectId
    for (old_id, new_id, supabase_id, username) in &user_updates {
        // First, create a new document with the new ObjectId
        let mut new_user_doc = users_collection
            .find_one(doc! {"_id": old_id})
            .await?
            .ok_or("User not found")?;

        // Update the _id field
        new_user_doc.insert("_id", new_id);

        // Insert the new document
        users_collection.insert_one(&new_user_doc).await?;

        // Delete the old document
        users_collection.delete_one(doc! {"_id": old_id}).await?;

        println!(
            "Updated user {} ({}) with new ObjectId: {}",
            username, supabase_id, new_id
        );
    }

    println!("\nUpdating references in tweets collection...");

    // Update all tweet references to use the new ObjectIds
    for (old_id, new_id, _, username) in &user_updates {
        // Update author_id in tweets
        let tweet_result = tweets_collection
            .update_many(
                doc! {"author_id": old_id},
                doc! {"$set": {"author_id": new_id}},
            )
            .await?;

        if tweet_result.modified_count > 0 {
            println!(
                "Updated {} tweets for user {} (author_id)",
                tweet_result.modified_count, username
            );
        }

        // Update author_snapshot.user_id in tweets
        let snapshot_result = tweets_collection
            .update_many(
                doc! {"author_snapshot.user_id": old_id},
                doc! {"$set": {"author_snapshot.user_id": new_id}},
            )
            .await?;

        if snapshot_result.modified_count > 0 {
            println!(
                "Updated {} tweet author snapshots for user {}",
                snapshot_result.modified_count, username
            );
        }

        // Update likes array in tweets
        let likes_result = tweets_collection
            .update_many(doc! {"likes": old_id}, doc! {"$set": {"likes.$": new_id}})
            .await?;

        if likes_result.modified_count > 0 {
            println!(
                "Updated {} tweet likes for user {}",
                likes_result.modified_count, username
            );
        }

        // Update retweets array in tweets
        let retweets_result = tweets_collection
            .update_many(
                doc! {"retweets": old_id},
                doc! {"$set": {"retweets.$": new_id}},
            )
            .await?;

        if retweets_result.modified_count > 0 {
            println!(
                "Updated {} tweet retweets for user {}",
                retweets_result.modified_count, username
            );
        }

        // Update quotes array in tweets
        let quotes_result = tweets_collection
            .update_many(doc! {"quotes": old_id}, doc! {"$set": {"quotes.$": new_id}})
            .await?;

        if quotes_result.modified_count > 0 {
            println!(
                "Updated {} tweet quotes for user {}",
                quotes_result.modified_count, username
            );
        }
    }

    println!("\nUpdating references in follows collection...");

    // Update all follow references to use the new ObjectIds
    for (old_id, new_id, _, username) in &user_updates {
        // Update follower_id in follows
        let follower_result = follows_collection
            .update_many(
                doc! {"follower_id": old_id},
                doc! {"$set": {"follower_id": new_id}},
            )
            .await?;

        if follower_result.modified_count > 0 {
            println!(
                "Updated {} follows where user {} is follower",
                follower_result.modified_count, username
            );
        }

        // Update following_id in follows
        let following_result = follows_collection
            .update_many(
                doc! {"following_id": old_id},
                doc! {"$set": {"following_id": new_id}},
            )
            .await?;

        if following_result.modified_count > 0 {
            println!(
                "Updated {} follows where user {} is being followed",
                following_result.modified_count, username
            );
        }
    }

    println!("\nMigration completed successfully!");
    println!(
        "Updated {} users with new unique ObjectIds",
        user_updates.len()
    );

    // Verify the migration
    println!("\nVerifying migration...");
    let remaining_duplicates = users_collection
        .count_documents(doc! {"_id": problematic_id})
        .await?;

    if remaining_duplicates == 0 {
        println!("✅ No users with duplicate ObjectId found. Migration successful!");
    } else {
        println!(
            "❌ {} users still have the duplicate ObjectId. Migration may have failed.",
            remaining_duplicates
        );
    }

    Ok(())
}
