// pub async fn wall(
//     State(db): State<Database>,
//     Path(id): Path<String>,
// ) -> Result<Json<Tweet>, (StatusCode, Json<serde_json::Value>)> {
//     let tweet_collection: Collection<Tweet> = db.collection("tweets");
//     let user_collection: Collection<crate::models::user::User> = db.collection("users");
// }
