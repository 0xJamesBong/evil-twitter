use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{de, Deserialize, Serialize};
use serde::de::Deserializer;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Follow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub follower_id: ObjectId,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub following_id: ObjectId,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FollowRequest {
    pub following_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FollowResponse {
    pub success: bool,
    pub message: String,
    pub is_following: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FollowStats {
    pub followers_count: i32,
    pub following_count: i32,
    pub is_following: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IntimateFollow {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub follower_id: ObjectId,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub following_id: ObjectId,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum IntimateFollowRequestStatus {
    Pending,
    Approved,
    Rejected,
}

impl Default for IntimateFollowRequestStatus {
    fn default() -> Self {
        Self::Pending
    }
}

impl IntimateFollowRequestStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }
}

fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

fn deserialize_object_id<'de, D>(deserializer: D) -> Result<ObjectId, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    struct OidWrapper {
        #[serde(rename = "$oid")]
        oid: String,
    }

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum ObjectIdRepr {
        String(String),
        Wrapped(OidWrapper),
    }

    match ObjectIdRepr::deserialize(deserializer)? {
        ObjectIdRepr::String(raw) => ObjectId::parse_str(&raw).map_err(|e| de::Error::custom(e.to_string())),
        ObjectIdRepr::Wrapped(wrapper) => ObjectId::parse_str(&wrapper.oid).map_err(|e| de::Error::custom(e.to_string())),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IntimateFollowRequest {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    #[serde(deserialize_with = "deserialize_object_id")]
    pub requester_id: ObjectId,
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    #[serde(deserialize_with = "deserialize_object_id")]
    pub target_id: ObjectId,
    #[serde(default)]
    pub status: IntimateFollowRequestStatus,
    #[serde(default = "now_utc")]
    pub created_at: DateTime<Utc>,
    #[serde(default = "now_utc")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IntimateFollowActionRequest {
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub requester_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IntimateFollowStatus {
    pub is_intimate_follower: bool,
    pub has_pending_request: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_status: Option<IntimateFollowRequestStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IntimateFollowActionResponse {
    pub success: bool,
    pub message: String,
    pub relationship_status: Option<IntimateFollowRequestStatus>,
    pub is_intimate_follower: bool,
}
