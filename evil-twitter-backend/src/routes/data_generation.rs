use axum::{extract::State, http::StatusCode, response::Json};
use futures::TryStreamExt;
use mongodb::{Collection, bson::doc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::models::{tweet::Tweet, user::User};
use mongodb::Database;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DataGenerationResponse {
    pub message: String,
    pub users_created: u32,
    pub tweets_created: u32,
    pub total_users: u64,
    pub total_tweets: u64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserGenerationRequest {
    pub count: Option<u32>,
    pub include_follows: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TweetGenerationRequest {
    pub tweets_per_user: Option<u32>,
    pub include_replies: Option<bool>,
}

/// Generate fake users for testing
#[utoipa::path(
    post,
    path = "/data/users/generate",
    request_body = UserGenerationRequest,
    responses(
        (status = 200, description = "Fake users generated successfully", body = DataGenerationResponse),
        (status = 500, description = "Database error during user generation")
    ),
    tag = "data-generation"
)]
pub async fn generate_fake_users(
    State(db): State<Database>,
    Json(request): Json<UserGenerationRequest>,
) -> Result<Json<DataGenerationResponse>, (StatusCode, Json<serde_json::Value>)> {
    let user_collection: Collection<User> = db.collection("users");
    let count = request.count.unwrap_or(26);
    let _include_follows = request.include_follows.unwrap_or(false);

    let names = [
        "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
        "Kate", "Liam", "Maya", "Noah", "Olivia", "Paul", "Quinn", "Ruby", "Sam", "Tara", "Uma",
        "Victor", "Wendy", "Xavier", "Yara", "Zoe", "Alex", "Blake", "Casey", "Drew", "Emery",
        "Finley", "Gray", "Harper", "Indigo", "Jordan", "Kendall", "Lane", "Morgan", "Nova",
        "Ocean", "Parker", "Quinn", "River", "Sage", "Taylor", "Urban", "Vale", "West", "Xen",
        "Yale", "Zion",
    ];

    let usernames = [
        "alice_dev",
        "bob_coder",
        "charlie_tech",
        "diana_ai",
        "eve_data",
        "frank_cloud",
        "grace_web",
        "henry_mobile",
        "ivy_ux",
        "jack_fullstack",
        "kate_frontend",
        "liam_backend",
        "maya_devops",
        "noah_ml",
        "olivia_cyber",
        "paul_blockchain",
        "quinn_iot",
        "ruby_api",
        "sam_react",
        "tara_vue",
        "uma_angular",
        "victor_node",
        "wendy_python",
        "xavier_rust",
        "yara_go",
        "zoe_swift",
        "alex_java",
        "blake_php",
        "casey_ruby",
        "drew_scala",
        "emery_cpp",
        "finley_csharp",
        "gray_swift",
        "harper_kotlin",
        "indigo_dart",
        "jordan_flutter",
        "kendall_vue",
        "lane_svelte",
        "morgan_ember",
        "nova_angular",
        "ocean_react",
        "parker_next",
        "quinn_nuxt",
        "river_gatsby",
        "sage_astro",
        "taylor_solid",
        "urban_qwik",
        "vale_svelte",
        "west_lit",
        "xen_stencil",
        "yale_riot",
        "zion_mithril",
    ];

    let mut created_count = 0;
    let mut created_users = Vec::new();

    for i in 0..count {
        let name = names[i as usize % names.len()];
        let username = usernames[i as usize % usernames.len()];
        let email = format!("{}@example.com", username);
        let supabase_id = format!("fake-user-{}-{}", i + 1, username);

        // Check if user already exists
        let existing_user = user_collection
            .find_one(doc! {"username": username})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error"})),
                )
            })?;

        if existing_user.is_some() {
            continue;
        }

        // Create user document
        let user = User {
            id: None,
            supabase_id,
            username: username.to_string(),
            display_name: name.to_string(),
            email,
            avatar_url: None,
            bio: Some(format!("Fake user {} - Software Developer", name)),
            created_at: mongodb::bson::DateTime::now(),
            followers_count: 0,
            following_count: 0,
            tweets_count: 0,
            dollar_conversion_rate: 10000,
            weapon_ids: vec![],
        };

        match user_collection.insert_one(&user).await {
            Ok(result) => {
                created_count += 1;
                created_users.push(result.inserted_id.as_object_id().unwrap());
            }
            Err(_) => {
                // Continue with other users even if one fails
                continue;
            }
        }
    }

    // Get total counts
    let total_users = user_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let total_tweets = tweet_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    Ok(Json(DataGenerationResponse {
        message: format!("Successfully generated {} fake users", created_count),
        users_created: created_count,
        tweets_created: 0,
        total_users,
        total_tweets,
    }))
}

/// Generate fake tweets for existing users
#[utoipa::path(
    post,
    path = "/data/tweets/generate",
    request_body = TweetGenerationRequest,
    responses(
        (status = 200, description = "Fake tweets generated successfully", body = DataGenerationResponse),
        (status = 500, description = "Database error during tweet generation")
    ),
    tag = "data-generation"
)]
pub async fn generate_fake_tweets(
    State(db): State<Database>,
    Json(request): Json<TweetGenerationRequest>,
) -> Result<Json<DataGenerationResponse>, (StatusCode, Json<serde_json::Value>)> {
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let user_collection: Collection<User> = db.collection("users");
    let tweets_per_user = request.tweets_per_user.unwrap_or(3);
    let include_replies = request.include_replies.unwrap_or(false);

    // Get all users
    let cursor = user_collection.find(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let users: Vec<User> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    if users.is_empty() {
        return Ok(Json(DataGenerationResponse {
            message: "No users found. Please create users first.".to_string(),
            users_created: 0,
            tweets_created: 0,
            total_users: 0,
            total_tweets: 0,
        }));
    }

    let mut total_tweets_created = 0;
    let now = mongodb::bson::DateTime::now();

    for user in &users {
        let user_id = user.id.unwrap();
        let username = &user.username;
        let display_name = &user.display_name;

        // Generate tweet content
        let tweet_contents =
            generate_tweet_content(username, display_name, tweets_per_user as usize);

        for content in tweet_contents {
            // Check if tweet already exists
            let existing_tweet = tweet_collection
                .find_one(doc! {
                    "owner_id": user_id,
                    "content": &content
                })
                .await
                .map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({"error": "Database error"})),
                    )
                })?;

            if existing_tweet.is_some() {
                continue;
            }

            // Create tweet
            let tweet = Tweet {
                id: None,
                owner_id: user_id,
                content,
                tweet_type: crate::models::tweet::TweetType::Original,
                quoted_tweet_id: None,
                replied_to_tweet_id: None,
                root_tweet_id: None,
                reply_depth: 0,
                created_at: now,
                updated_at: Some(now),
                metrics: crate::models::tweet::TweetMetrics::default(),
                author_snapshot: crate::models::tweet::TweetAuthorSnapshot {
                    username: Some(username.clone()),
                    display_name: Some(display_name.clone()),
                    avatar_url: None,
                },
                viewer_context: crate::models::tweet::TweetViewerContext::default(),
                health: crate::models::tweet::TweetHealthState::default(),
                virality: crate::models::tweet::TweetViralitySnapshot::default(),
            };

            match tweet_collection.insert_one(&tweet).await {
                Ok(_) => {
                    total_tweets_created += 1;
                }
                Err(_) => {
                    // Continue with other tweets even if one fails
                    continue;
                }
            }
        }
    }

    // Update user tweet counts
    for user in &users {
        let user_id = user.id.unwrap();
        let tweet_count = tweet_collection
            .count_documents(doc! {"owner_id": user_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error"})),
                )
            })?;

        user_collection
            .update_one(
                doc! {"_id": user_id},
                doc! {"$set": {"tweets_count": tweet_count as i32}},
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error"})),
                )
            })?;
    }

    // Get total counts
    let total_users = user_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let total_tweets = tweet_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    Ok(Json(DataGenerationResponse {
        message: format!(
            "Successfully generated {} fake tweets",
            total_tweets_created
        ),
        users_created: 0,
        tweets_created: total_tweets_created,
        total_users,
        total_tweets,
    }))
}

/// Clear all data (users, tweets, follows)
#[utoipa::path(
    delete,
    path = "/data/clear",
    responses(
        (status = 200, description = "All data cleared successfully", body = DataGenerationResponse),
        (status = 500, description = "Database error during data clearing")
    ),
    tag = "data-generation"
)]
pub async fn clear_all_data(
    State(db): State<Database>,
) -> Result<Json<DataGenerationResponse>, (StatusCode, Json<serde_json::Value>)> {
    let user_collection: Collection<User> = db.collection("users");
    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let follow_collection: Collection<mongodb::bson::Document> = db.collection("follows");

    // Clear all collections
    user_collection.delete_many(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    tweet_collection.delete_many(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    follow_collection.delete_many(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    Ok(Json(DataGenerationResponse {
        message: "All data cleared successfully".to_string(),
        users_created: 0,
        tweets_created: 0,
        total_users: 0,
        total_tweets: 0,
    }))
}

/// Generate comprehensive fake data (users + tweets)
#[utoipa::path(
    post,
    path = "/data/generate",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "Fake data generated successfully", body = DataGenerationResponse),
        (status = 500, description = "Database error during data generation")
    ),
    tag = "data-generation"
)]
pub async fn generate_fake_data(
    State(db): State<Database>,
) -> Result<Json<DataGenerationResponse>, (StatusCode, Json<serde_json::Value>)> {
    // First generate users
    let user_request = UserGenerationRequest {
        count: Some(26),
        include_follows: Some(false),
    };

    // Generate users directly
    let user_collection: Collection<User> = db.collection("users");
    let count = 26;
    let include_follows = false;

    let names = [
        "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack",
        "Kate", "Liam", "Maya", "Noah", "Olivia", "Paul", "Quinn", "Ruby", "Sam", "Tara", "Uma",
        "Victor", "Wendy", "Xavier", "Yara", "Zoe", "Alex", "Blake", "Casey", "Drew", "Emery",
        "Finley", "Gray", "Harper", "Indigo", "Jordan", "Kendall", "Lane", "Morgan", "Nova",
        "Ocean", "Parker", "Quinn", "River", "Sage", "Taylor", "Urban", "Vale", "West", "Xen",
        "Yale", "Zion",
    ];

    let usernames = [
        "alice_dev",
        "bob_coder",
        "charlie_tech",
        "diana_ai",
        "eve_data",
        "frank_cloud",
        "grace_web",
        "henry_mobile",
        "ivy_ux",
        "jack_fullstack",
        "kate_frontend",
        "liam_backend",
        "maya_devops",
        "noah_ml",
        "olivia_cyber",
        "paul_blockchain",
        "quinn_iot",
        "ruby_api",
        "sam_react",
        "tara_vue",
        "uma_angular",
        "victor_node",
        "wendy_python",
        "xavier_rust",
        "yara_go",
        "zoe_swift",
        "alex_java",
        "blake_php",
        "casey_ruby",
        "drew_scala",
        "emery_cpp",
        "finley_csharp",
        "gray_swift",
        "harper_kotlin",
        "indigo_dart",
        "jordan_flutter",
        "kendall_vue",
        "lane_svelte",
        "morgan_ember",
        "nova_angular",
        "ocean_react",
        "parker_next",
        "quinn_nuxt",
        "river_gatsby",
        "sage_astro",
        "taylor_solid",
        "urban_qwik",
        "vale_svelte",
        "west_lit",
        "xen_stencil",
        "yale_riot",
        "zion_mithril",
    ];

    let mut created_count = 0;
    let mut created_users = Vec::new();

    for i in 0..count {
        let name = names[i as usize % names.len()];
        let username = usernames[i as usize % usernames.len()];
        let email = format!("{}@example.com", username);
        let supabase_id = format!("fake-user-{}-{}", i + 1, username);

        // Check if user already exists
        let existing_user = user_collection
            .find_one(doc! {"username": username})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error"})),
                )
            })?;

        if existing_user.is_some() {
            continue;
        }

        // Create user document
        let user = User {
            id: None,
            supabase_id,
            username: username.to_string(),
            display_name: name.to_string(),
            email,
            avatar_url: None,
            bio: Some(format!("Fake user {} - Software Developer", name)),
            created_at: mongodb::bson::DateTime::now(),
            followers_count: 0,
            following_count: 0,
            tweets_count: 0,
            dollar_conversion_rate: 10000,
            weapon_ids: vec![],
        };

        match user_collection.insert_one(&user).await {
            Ok(result) => {
                created_count += 1;
                created_users.push(result.inserted_id.as_object_id().unwrap());
            }
            Err(_) => {
                // Continue with other users even if one fails
                continue;
            }
        }
    }

    // Get total counts
    let total_users = user_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let tweet_collection: Collection<Tweet> = db.collection("tweets");
    let total_tweets = tweet_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    // Now generate tweets for all users
    let cursor = user_collection.find(doc! {}).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let users: Vec<User> = cursor.try_collect().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Database error"})),
        )
    })?;

    let mut total_tweets_created = 0;
    let now = mongodb::bson::DateTime::now();

    for user in &users {
        let user_id = user.id.unwrap();
        let username = &user.username;
        let display_name = &user.display_name;

        // Generate tweet content
        let tweet_contents = generate_tweet_content(username, display_name, 3);

        for content in tweet_contents {
            // Check if tweet already exists
            let existing_tweet = tweet_collection
                .find_one(doc! {
                    "owner_id": user_id,
                    "content": &content
                })
                .await
                .map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({"error": "Database error"})),
                    )
                })?;

            if existing_tweet.is_some() {
                continue;
            }

            // Create tweet
            let tweet = Tweet {
                id: None,
                owner_id: user_id,
                content,
                tweet_type: crate::models::tweet::TweetType::Original,
                quoted_tweet_id: None,
                replied_to_tweet_id: None,
                root_tweet_id: None,
                reply_depth: 0,
                created_at: now,
                updated_at: Some(now),
                metrics: crate::models::tweet::TweetMetrics::default(),
                author_snapshot: crate::models::tweet::TweetAuthorSnapshot {
                    username: Some(username.clone()),
                    display_name: Some(display_name.clone()),
                    avatar_url: None,
                },
                viewer_context: crate::models::tweet::TweetViewerContext::default(),
                health: crate::models::tweet::TweetHealthState::default(),
                virality: crate::models::tweet::TweetViralitySnapshot::default(),
            };

            match tweet_collection.insert_one(&tweet).await {
                Ok(_) => {
                    total_tweets_created += 1;
                }
                Err(_) => {
                    // Continue with other tweets even if one fails
                    continue;
                }
            }
        }
    }

    // Update user tweet counts
    for user in &users {
        let user_id = user.id.unwrap();
        let tweet_count = tweet_collection
            .count_documents(doc! {"owner_id": user_id})
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error"})),
                )
            })?;

        user_collection
            .update_one(
                doc! {"_id": user_id},
                doc! {"$set": {"tweets_count": tweet_count as i32}},
            )
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": "Database error"})),
                )
            })?;
    }

    // Get final counts
    let final_total_users = user_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    let final_total_tweets = tweet_collection
        .count_documents(doc! {})
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
        })?;

    Ok(Json(DataGenerationResponse {
        message: "Successfully generated fake data".to_string(),
        users_created: created_count,
        tweets_created: total_tweets_created,
        total_users: final_total_users,
        total_tweets: final_total_tweets,
    }))
}

fn generate_tweet_content(username: &str, display_name: &str, count: usize) -> Vec<String> {
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

    let mut tweets = Vec::new();

    for i in 0..count {
        let hashtag = get_hashtag(username);
        let content = match i % 3 {
            0 => format!(
                "{} {}",
                tech_topics[username.len() % tech_topics.len()],
                hashtag
            ),
            1 => format!(
                "{} {}",
                personal_tweets[display_name.len() % personal_tweets.len()],
                hashtag
            ),
            _ => format!(
                "{} {}",
                motivational_tweets
                    [(username.len() + display_name.len()) % motivational_tweets.len()],
                hashtag
            ),
        };
        tweets.push(content);
    }

    tweets
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
