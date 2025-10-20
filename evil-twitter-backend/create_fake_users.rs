use mongodb::{Client, bson::doc};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenvy::dotenv().ok();

    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let mongo_db = std::env::var("MONGO_DB_NAME").expect("MONGO_DB_NAME must be set");

    // Connect to MongoDB
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database(&mongo_db);
    let collection = db.collection("users");

    println!("Creating 26 fake users (A to Z)...");

    let names = [
        "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry",
        "Ivy", "Jack", "Kate", "Liam", "Maya", "Noah", "Olivia", "Paul",
        "Quinn", "Ruby", "Sam", "Tara", "Uma", "Victor", "Wendy", "Xavier",
        "Yara", "Zoe"
    ];

    let usernames = [
        "alice_dev", "bob_coder", "charlie_tech", "diana_ai", "eve_data", "frank_cloud",
        "grace_web", "henry_mobile", "ivy_ux", "jack_fullstack", "kate_frontend", "liam_backend",
        "maya_devops", "noah_ml", "olivia_cyber", "paul_blockchain", "quinn_iot", "ruby_api",
        "sam_react", "tara_vue", "uma_angular", "victor_node", "wendy_python", "xavier_rust",
        "yara_go", "zoe_swift"
    ];

    let mut created_count = 0;

    for (i, name) in names.iter().enumerate() {
        let username = usernames[i];
        let email = format!("{}@example.com", username);
        let supabase_id = format!("fake-user-{}-{}", i + 1, username);
        
        // Check if user already exists
        let existing_user = collection
            .find_one(doc! {"username": username})
            .await?;

        if existing_user.is_some() {
            println!("User {} already exists, skipping...", name);
            continue;
        }

        // Create user document
        let user_doc = doc! {
            "supabase_id": supabase_id,
            "username": username,
            "display_name": name,
            "email": email,
            "avatar_url": null,
            "bio": format!("Fake user {} - Software Developer", name),
            "created_at": mongodb::bson::DateTime::now(),
            "followers_count": 0,
            "following_count": 0,
            "tweets_count": 0,
            "dollar_conversion_rate": 10000,
            "weapon_ids": []
        };

        // Insert user
        match collection.insert_one(&user_doc).await {
            Ok(result) => {
                println!("✅ Created user {} ({}) with ID: {}", name, username, result.inserted_id);
                created_count += 1;
            }
            Err(e) => {
                println!("❌ Failed to create user {}: {}", name, e);
            }
        }
    }

    println!("\n🎉 Fake users creation completed!");
    println!("Created {} new users", created_count);
    println!("Skipped {} existing users", 26 - created_count);

    // Verify creation
    let total_users = collection.count_documents(doc! {}).await?;
    println!("Total users in database: {}", total_users);

    Ok(())
}
