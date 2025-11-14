use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema)]
pub enum TokenType {
    Dooler,
    Usdc,
    Sol,
    Bling,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum AccountOwner {
    User(ObjectId),
    Tweet(ObjectId),
    Protocol,
}
