use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct PumpSmackState {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,

    pub user_id: ObjectId,
    pub tweet_id: ObjectId,

    pub pump_count: i64,
    pub smack_count: i64,

    pub created_at: DateTime,
    pub updated_at: DateTime,
}

impl PumpSmackState {
    pub fn new(user_id: ObjectId, tweet_id: ObjectId) -> Self {
        Self {
            id: None,
            user_id,
            tweet_id,
            pump_count: 0,
            smack_count: 0,
            created_at: DateTime::now(),
            updated_at: DateTime::now(),
        }
    }

    pub fn calc_pump_price(&self) -> i64 {
        self.pump_count + 1
    }

    pub fn calc_smack_price(&self) -> i64 {
        self.smack_count + 1 * 10
    }
}
