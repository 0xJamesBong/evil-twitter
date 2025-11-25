use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, ToSchema)]
pub enum LoginType {
    #[serde(rename = "email_embedded")]
    EmailEmbedded,
    #[serde(rename = "phantom_external")]
    PhantomExternal,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, ToSchema)]
pub enum UserStatus {
    Active,
    Banned,
    ShadowBanned,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(example = "did:privy:abc123")]
    pub privy_id: String, // Privy DID

    #[schema(example = "7xKXtg2CZ3QZ4Z3J3J3J3J3J3J3J3J3J3J3J3J3J3")]
    pub wallet: String, // base58 Solana pubkey

    #[schema(example = "email_embedded")]
    pub login_type: LoginType,

    #[schema(example = "john@example.com")]
    pub email: Option<String>, // Only for email_embedded users

    #[schema(example = "Active")]
    pub status: UserStatus,

    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateUser {
    #[schema(example = "did:privy:abc123")]
    pub privy_id: String,

    #[schema(example = "7xKXtg2CZ3QZ4Z3J3J3J3J3J3J3J3J3J3J3J3J3")]
    pub wallet: String,

    #[schema(example = "email_embedded")]
    pub login_type: LoginType,

    #[schema(example = "john@example.com")]
    pub email: Option<String>,
}

impl User {
    pub const COLLECTION_NAME: &str = "users";
}
