use futures::TryStreamExt;
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
    let users_collection: mongodb::Collection<mongodb::bson::Document> = db.collection("users");
    let tweets_collection: mongodb::Collection<mongodb::bson::Document> = db.collection("tweets");

    println!("Creating fake tweets for all users...");

    // Get all users
    let cursor = users_collection.find(doc! {}).await?;
    let users: Vec<mongodb::bson::Document> = cursor.try_collect().await?;

    if users.is_empty() {
        println!("No users found in database. Please create users first.");
        return Ok(());
    }

    let mut total_tweets_created = 0;

    for user in &users {
        let user_id = user.get_object_id("_id")?;
        let username = user.get_str("username")?;
        let display_name = user.get_str("display_name")?;

        println!("\nCreating tweets for {} ({})...", display_name, username);

        // Create 3 tweets per user
        let tweet_contents = generate_tweet_content(username, display_name);

        for (i, content) in tweet_contents.iter().enumerate() {
            // Check if tweet already exists (to avoid duplicates on re-runs)
            let existing_tweet = tweets_collection
                .find_one(doc! {
                    "owner_id": user_id,
                    "content": content
                })
                .await?;

            if existing_tweet.is_some() {
                println!("  Tweet {} already exists, skipping...", i + 1);
                continue;
            }

            // Create tweet document
            let tweet_doc = doc! {
                "owner_id": user_id,
                "content": content,
                "tweet_type": "Original",
                "quoted_tweet_id": null,
                "replied_to_tweet_id": null,
                "root_tweet_id": null,
                "reply_depth": 0,
                "created_at": mongodb::bson::DateTime::now(),
                "updated_at": null,
                "metrics": {
                    "likes": 0,
                    "retweets": 0,
                    "quotes": 0,
                    "replies": 0,
                    "impressions": 0
                },
                "author_snapshot": {
                    "username": username,
                    "display_name": display_name,
                    "avatar_url": null
                },
                "viewer_context": {
                    "is_liked": false,
                    "is_retweeted": false,
                    "is_quoted": false
                },
                "health": {
                    "current": 100,
                    "max": 100,
                    "history": {
                        "heal_history": [],
                        "attack_history": []
                    }
                },
                "virality": {
                    "score": 0.0,
                    "momentum": 0.0,
                    "health_multiplier": 1.0
                }
            };

            // Insert tweet
            match tweets_collection.insert_one(&tweet_doc).await {
                Ok(result) => {
                    println!("  ✅ Created tweet {}: \"{}\"", i + 1, content);
                    total_tweets_created += 1;
                }
                Err(e) => {
                    println!("  ❌ Failed to create tweet {}: {}", i + 1, e);
                }
            }
        }
    }

    // Update user tweet counts
    for user in &users {
        let user_id = user.get_object_id("_id")?;
        let tweet_count = tweets_collection
            .count_documents(doc! {"owner_id": user_id})
            .await?;

        users_collection
            .update_one(
                doc! {"_id": user_id},
                doc! {"$set": {"tweets_count": tweet_count as i32}},
            )
            .await?;
    }

    println!("\n🎉 Fake tweets creation completed!");
    println!("Created {} new tweets", total_tweets_created);

    // Verify creation
    let total_tweets = tweets_collection.count_documents(doc! {}).await?;
    println!("Total tweets in database: {}", total_tweets);

    Ok(())
}

fn generate_tweet_content(username: &str, display_name: &str) -> Vec<String> {
    let tech_topics = [
        "Just discovered an amazing new framework! 🚀",
        "Debugging for 3 hours and it was a missing semicolon... 😅",
        "Coffee is the best debugging tool ☕️",
        "Code review time! Always learning something new 📚",
        "Deployed to production today! Fingers crossed 🤞",
        "Pair programming session was incredibly productive 👥",
        "Refactoring legacy code is like archaeology 🏛️",
        "Test-driven development saves lives! 🧪",
        "Open source community is amazing 🌟",
        "Learning new technology every day 📖",
    ];

    let personal_tweets = [
        "Beautiful day for coding! ☀️",
        "Weekend project coming along nicely 🛠️",
        "Team meeting was super productive today! 💪",
        "Just shipped a feature I'm really proud of 🎉",
        "Mentoring junior developers is so rewarding 👨‍🏫",
        "Tech conference was mind-blowing! 🧠",
        "Working from home has its perks 🏠",
        "Code quality over speed, always! ⚡",
        "Documentation is underrated 📝",
        "Collaboration makes everything better 🤝",
    ];

    let motivational_tweets = [
        "Keep learning, keep growing! 🌱",
        "Every bug is a learning opportunity 🐛",
        "Consistency beats perfection every time ⏰",
        "The best code is readable code 📖",
        "Don't be afraid to ask questions! ❓",
        "Mistakes are just stepping stones 🪨",
        "Code with empathy, always ❤️",
        "Small steps lead to big changes 👣",
        "The journey is just as important as the destination 🗺️",
        "Believe in your ability to solve problems! 💡",
    ];

    // Generate 3 tweets per user with variety
    vec![
        format!(
            "{} {}",
            tech_topics[username.len() % tech_topics.len()],
            get_hashtag(username)
        ),
        format!(
            "{} {}",
            personal_tweets[display_name.len() % personal_tweets.len()],
            get_hashtag(username)
        ),
        format!(
            "{} {}",
            motivational_tweets[(username.len() + display_name.len()) % motivational_tweets.len()],
            get_hashtag(username)
        ),
    ]
}

fn get_hashtag(username: &str) -> String {
    let tech_hashtags = [
        "#coding",
        "#programming",
        "#webdev",
        "#javascript",
        "#python",
        "#rust",
        "#react",
        "#nodejs",
        "#typescript",
        "#golang",
        "#docker",
        "#kubernetes",
        "#aws",
        "#azure",
        "#gcp",
        "#machinelearning",
        "#ai",
        "#blockchain",
        "#opensource",
        "#devops",
        "#frontend",
        "#backend",
        "#fullstack",
        "#mobile",
        "#database",
        "#sql",
        "#nosql",
        "#mongodb",
        "#postgresql",
        "#redis",
    ];

    let hashtag = tech_hashtags[username.len() % tech_hashtags.len()];
    format!("{} #tech #developer", hashtag)
}
