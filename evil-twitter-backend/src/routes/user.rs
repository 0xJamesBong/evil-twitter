// use axum::{
//     Json,
//     extract::{Path, Query, State},
//     http::StatusCode,
// };
// use futures::TryStreamExt;
// use mongodb::{
//     Collection, Database,
//     bson::{doc, oid::ObjectId},
// };
// use serde::Serialize;
// use utoipa::ToSchema;

// use crate::models::user::{AttackRateRequest, CreateUser, ImproveRateRequest, User};
// use serde::Deserialize;

// #[derive(Debug, Deserialize)]
// pub struct UserQuery {
//     pub supabase_id: Option<String>,
//     pub email: Option<String>,
// }

// #[derive(Debug, Serialize, ToSchema)]
// pub struct UserListResponse {
//     pub users: Vec<User>,
//     pub total: i64,
// }

// /// Create a new user
// #[utoipa::path(
//     post,
//     path = "/users",
//     request_body = CreateUser,
//     responses(
//         (status = 201, description = "User created successfully", body = User),
//         (status = 400, description = "Invalid input data"),
//         (status = 409, description = "Username or email already exists")
//     ),
//     tag = "users"
// )]
// pub async fn create_user(
//     State(db): State<Database>,
//     Json(payload): Json<CreateUser>,
// ) -> Result<(StatusCode, Json<User>), (StatusCode, Json<serde_json::Value>)> {
//     let collection: Collection<User> = db.collection("users");

//     // Check if supabase_id, username or email already exists
//     let existing_user = collection
//         .find_one(doc! {
//             "$or": [
//                 {"supabase_id": &payload.supabase_id},
//                 {"username": &payload.username},
//                 {"email": &payload.email}
//             ]
//         })
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?;

//     if existing_user.is_some() {
//         return Err((
//             StatusCode::CONFLICT,
//             Json(serde_json::json!({"error": "Username or email already exists"})),
//         ));
//     }

//     let now = mongodb::bson::DateTime::now();
//     let user = User {
//         id: None,
//         supabase_id: payload.supabase_id,
//         username: payload.username,
//         display_name: payload.display_name,
//         email: payload.email,
//         avatar_url: payload.avatar_url,
//         bio: payload.bio,
//         created_at: now,
//         followers_count: 0,
//         following_count: 0,
//         tweets_count: 0,
//         dollar_conversion_rate: 10000,
//         weapon_ids: Vec::new(),
//     };

//     let result = collection.insert_one(&user).await.map_err(|_| {
//         (
//             StatusCode::INTERNAL_SERVER_ERROR,
//             Json(serde_json::json!({"error": "Failed to create user"})),
//         )
//     })?;

//     let mut created_user = user;
//     let user_id = result.inserted_id.as_object_id().unwrap();
//     created_user.id = Some(user_id);

//     // Give new user 10k BLING tokens
//     use crate::models::tokens::{enums::TokenType, token_balance::TokenBalance};
//     let token_balance_collection: Collection<TokenBalance> = db.collection("token_balances");

//     let initial_bling = 10_000_i64;
//     let bling_balance = TokenBalance {
//         user_id,
//         token: TokenType::Bling,
//         amount: initial_bling,
//     };

//     // Check if balance already exists
//     let existing_balance = token_balance_collection
//         .find_one(doc! {
//             "user_id": user_id,
//             "token": mongodb::bson::to_bson(&TokenType::Bling)
//                 .map_err(|_| {
//                     (
//                         StatusCode::INTERNAL_SERVER_ERROR,
//                         Json(serde_json::json!({"error": "Serialization error"})),
//                     )
//                 })?,
//         })
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error checking balance"})),
//             )
//         })?;

//     if existing_balance.is_none() {
//         // Insert new balance with 10k BLING
//         token_balance_collection
//             .insert_one(&bling_balance)
//             .await
//             .map_err(|_| {
//                 (
//                     StatusCode::INTERNAL_SERVER_ERROR,
//                     Json(serde_json::json!({"error": "Failed to initialize BLING balance"})),
//                 )
//             })?;
//     } else {
//         // Update existing balance to ensure it's at least 10k (don't reduce if they have more)
//         token_balance_collection
//             .update_one(
//                 doc! {
//                     "user_id": user_id,
//                     "token": mongodb::bson::to_bson(&TokenType::Bling)
//                         .map_err(|_| {
//                             (
//                                 StatusCode::INTERNAL_SERVER_ERROR,
//                                 Json(serde_json::json!({"error": "Serialization error"})),
//                             )
//                         })?,
//                     "amount": { "$lt": initial_bling }
//                 },
//                 doc! {
//                     "$set": {
//                         "amount": initial_bling
//                     }
//                 },
//             )
//             .await
//             .map_err(|_| {
//                 (
//                     StatusCode::INTERNAL_SERVER_ERROR,
//                     Json(serde_json::json!({"error": "Failed to update BLING balance"})),
//                 )
//             })?;
//     }

//     Ok((StatusCode::CREATED, Json(created_user)))
// }

// /// Get user token balances
// #[utoipa::path(
//     get,
//     path = "/users/{id}/balances",
//     params(("id" = String, Path, description = "User ID")),
//     responses(
//         (status = 200, description = "Token balances retrieved successfully"),
//         (status = 404, description = "User not found")
//     ),
//     tag = "users"
// )]
// pub async fn get_user_balances(
//     State(db): State<Database>,
//     Path(id): Path<String>,
// ) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
//     use crate::models::tokens::token_balance::TokenBalance;

//     let user_object_id = ObjectId::parse_str(&id).map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Invalid user ID"})),
//         )
//     })?;

//     let token_balance_collection: Collection<TokenBalance> = db.collection("token_balances");

//     // Get all token balances for this user
//     let mut cursor = token_balance_collection
//         .find(doc! {"user_id": user_object_id})
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?;

//     let mut balances: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

//     // Initialize all token types to 0
//     balances.insert("Dooler".to_string(), 0);
//     balances.insert("Usdc".to_string(), 0);
//     balances.insert("Bling".to_string(), 0);
//     balances.insert("Sol".to_string(), 0);

//     while let Some(balance) = cursor.try_next().await.map_err(|_| {
//         (
//             StatusCode::INTERNAL_SERVER_ERROR,
//             Json(serde_json::json!({"error": "Database error reading balances"})),
//         )
//     })? {
//         let token_name = format!("{:?}", balance.token);
//         balances.insert(token_name, balance.amount);
//     }

//     Ok(Json(serde_json::json!({
//         "user_id": id,
//         "balances": balances
//     })))
// }

// /// Get user by ID
// #[utoipa::path(
//     get,
//     path = "/users/{id}",
//     params(
//         ("id" = String, Path, description = "User ID")
//     ),
//     responses(
//         (status = 200, description = "User found", body = User),
//         (status = 404, description = "User not found")
//     ),
//     tag = "users"
// )]
// pub async fn get_user(
//     State(db): State<Database>,
//     Path(id): Path<String>,
// ) -> Result<Json<User>, (StatusCode, Json<serde_json::Value>)> {
//     let collection: Collection<User> = db.collection("users");
//     let object_id = ObjectId::parse_str(&id).map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Invalid user ID"})),
//         )
//     })?;

//     let user = collection
//         .find_one(doc! {"_id": object_id})
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?;

//     match user {
//         Some(user) => Ok(Json(user)),
//         None => Err((
//             StatusCode::NOT_FOUND,
//             Json(serde_json::json!({"error": "User not found"})),
//         )),
//     }
// }

// /// Get all users
// #[utoipa::path(
//     get,
//     path = "/users",
//     responses(
//         (status = 200, description = "Users list", body = UserListResponse)
//     ),
//     tag = "users"
// )]
// pub async fn get_users(
//     State(db): State<Database>,
//     Query(query): Query<UserQuery>,
// ) -> Result<Json<UserListResponse>, (StatusCode, Json<serde_json::Value>)> {
//     let collection: Collection<User> = db.collection("users");

//     // Build query filter based on parameters
//     let mut filter = doc! {};
//     if let Some(supabase_id) = &query.supabase_id {
//         filter.insert("supabase_id", supabase_id);
//     }
//     if let Some(email) = &query.email {
//         filter.insert("email", email);
//     }

//     let cursor = collection
//         .find(filter)
//         .sort(doc! {"created_at": -1})
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?;

//     let users: Vec<User> = cursor.try_collect().await.map_err(|_| {
//         (
//             StatusCode::INTERNAL_SERVER_ERROR,
//             Json(serde_json::json!({"error": "Database error"})),
//         )
//     })?;

//     let total = users.len() as i64;

//     Ok(Json(UserListResponse { users, total }))
// }

// /// Improve a user's dollar conversion rate
// #[utoipa::path(
//     post,
//     path = "/users/{user_id}/improve",
//     responses(
//         (status = 200, description = "Dollar conversion rate improved successfully"),
//         (status = 400, description = "Invalid improvement amount"),
//         (status = 404, description = "User not found"),
//         (status = 500, description = "Database error")
//     ),
//     tag = "users"
// )]
// pub async fn improve_dollar_rate(
//     State(db): State<Database>,
//     Path(user_id): Path<String>,
//     Json(payload): Json<ImproveRateRequest>,
// ) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
//     let collection: Collection<User> = db.collection("users");

//     // Parse user ID
//     let user_object_id = ObjectId::parse_str(&user_id).map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Invalid user ID"})),
//         )
//     })?;

//     // Validate improvement amount
//     if payload.amount <= 0 || payload.amount > 1000 {
//         return Err((
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Improvement amount must be between 1 and 1000"})),
//         ));
//     }

//     // Get current user
//     let user = collection
//         .find_one(doc! {"_id": user_object_id})
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?
//         .ok_or_else(|| {
//             (
//                 StatusCode::NOT_FOUND,
//                 Json(serde_json::json!({"error": "User not found"})),
//             )
//         })?;

//     // Calculate new rate (capped at 10000)
//     let new_rate = (user.dollar_conversion_rate + payload.amount).min(10000);

//     // Update user
//     let result = collection
//         .update_one(
//             doc! {"_id": user_object_id},
//             doc! {"$set": {"dollar_conversion_rate": new_rate}},
//         )
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?;

//     if result.modified_count == 0 {
//         return Err((
//             StatusCode::NOT_FOUND,
//             Json(serde_json::json!({"error": "User not found"})),
//         ));
//     }

//     Ok((
//         StatusCode::OK,
//         Json(serde_json::json!({
//             "message": "Dollar conversion rate improved successfully",
//             "new_rate": new_rate,
//             "improvement": payload.amount
//         })),
//     ))
// }

// /// Attack a user's dollar conversion rate
// #[utoipa::path(
//     post,
//     path = "/users/{user_id}/attack",
//     responses(
//         (status = 200, description = "Dollar conversion rate attacked successfully"),
//         (status = 400, description = "Invalid attack amount"),
//         (status = 404, description = "User not found"),
//         (status = 500, description = "Database error")
//     ),
//     tag = "users"
// )]
// pub async fn attack_dollar_rate(
//     State(db): State<Database>,
//     Path(user_id): Path<String>,
//     Json(payload): Json<AttackRateRequest>,
// ) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
//     let collection: Collection<User> = db.collection("users");

//     // Parse user ID
//     let user_object_id = ObjectId::parse_str(&user_id).map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Invalid user ID"})),
//         )
//     })?;

//     // Validate attack amount
//     if payload.amount <= 0 || payload.amount > 1000 {
//         return Err((
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Attack amount must be between 1 and 1000"})),
//         ));
//     }

//     // Get current user
//     let user = collection
//         .find_one(doc! {"_id": user_object_id})
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?
//         .ok_or_else(|| {
//             (
//                 StatusCode::NOT_FOUND,
//                 Json(serde_json::json!({"error": "User not found"})),
//             )
//         })?;

//     // Calculate new rate (capped at 0 minimum)
//     let new_rate = (user.dollar_conversion_rate - payload.amount).max(0);

//     // Update user
//     let result = collection
//         .update_one(
//             doc! {"_id": user_object_id},
//             doc! {"$set": {"dollar_conversion_rate": new_rate}},
//         )
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?;

//     if result.modified_count == 0 {
//         return Err((
//             StatusCode::NOT_FOUND,
//             Json(serde_json::json!({"error": "User not found"})),
//         ));
//     }

//     Ok((
//         StatusCode::OK,
//         Json(serde_json::json!({
//             "message": "Dollar conversion rate attacked successfully",
//             "new_rate": new_rate,
//             "damage": payload.amount
//         })),
//     ))
// }

// /// Get a user's dollar conversion rate
// #[utoipa::path(
//     get,
//     path = "/users/{user_id}/dollar-rate",
//     responses(
//         (status = 200, description = "Dollar conversion rate retrieved successfully"),
//         (status = 404, description = "User not found"),
//         (status = 500, description = "Database error")
//     ),
//     tag = "users"
// )]
// pub async fn get_dollar_rate(
//     State(db): State<Database>,
//     Path(user_id): Path<String>,
// ) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
//     let collection: Collection<User> = db.collection("users");

//     // Parse user ID
//     let user_object_id = ObjectId::parse_str(&user_id).map_err(|_| {
//         (
//             StatusCode::BAD_REQUEST,
//             Json(serde_json::json!({"error": "Invalid user ID"})),
//         )
//     })?;

//     // Get user
//     let user = collection
//         .find_one(doc! {"_id": user_object_id})
//         .await
//         .map_err(|_| {
//             (
//                 StatusCode::INTERNAL_SERVER_ERROR,
//                 Json(serde_json::json!({"error": "Database error"})),
//             )
//         })?
//         .ok_or_else(|| {
//             (
//                 StatusCode::NOT_FOUND,
//                 Json(serde_json::json!({"error": "User not found"})),
//             )
//         })?;

//     Ok(Json(serde_json::json!({
//         "user_id": user_id,
//         "username": user.username,
//         "display_name": user.display_name,
//         "dollar_conversion_rate": user.dollar_conversion_rate
//     })))
// }
