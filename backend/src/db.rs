use dotenvy::dotenv;
use mongodb::{Client, Database};
use std::env;

pub async fn connect_to_db() -> mongodb::error::Result<Database> {
    dotenv().ok(); // load .env

    let uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let db_name = env::var("DATABASE_NAME").expect("DATABASE_NAME must be set");

    let client = Client::with_uri_str(&uri).await?;
    Ok(client.database(&db_name))
}
