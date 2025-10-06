// use mongodb::bson::oid::ObjectId;
// use serde::{Deserialize, Serialize};
// use utoipa::ToSchema;

// // #[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
// // pub enum ToolType {
// //     Weapon,
// //     Medicine,
// //     Defense,
// // }

// // pub trait HaveLifetime {
// //     fn health(&self) -> i32;
// //     fn max_health(&self) -> i32 {
// //         10000
// //     }
// //     fn decay_rate(&self) -> i32 {
// //         1
// //     }
// //     fn remaining_health_ratio(&self) -> f32 {
// //         self.health() as f32 / self.max_health() as f32
// //     }
// //     fn degrade(&mut self, amount: i32) {}

// //     fn is_broken(&self) -> bool {
// //         self.health() <= 0
// //     }
// // }

// // pub trait UsableOnTweet {
// //     fn raw_damage(&self) -> i32;
// // }

// // pub trait UsableOnBeing {}

// // pub enum UsableOn {
// //     Tweet,
// //     Being,
// // }

// // pub struct Weapon {}

// // #[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
// // pub struct Tool {
// //     #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
// //     #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
// //     pub id: Option<ObjectId>,

// //     #[schema(example = "Heal")]
// //     pub tool_type: ToolType,

// //     pub health: i32,
// // }

// // impl Tool {
// //     pub fn new(tool_type: ToolType) -> Self {
// //         Self {
// //             id: None,
// //             tool_type,
// //             health: 100,
// //         }
// //     }
// // }

// // impl HaveLifetime for Tool {
// //     fn health(&self) -> i32 {
// //         self.health
// //     }
// // }
