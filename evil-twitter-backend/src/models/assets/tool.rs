use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub enum ToolType {
    Weapon,
    Support,
    // Defence,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub enum ToolTarget {
    Tweet,
    User,
}

pub trait HaveLifetime {
    fn health(&self) -> i32;
    fn max_health(&self) -> i32 {
        10000
    }

    fn degrade(&mut self, amount: i32) {
        let new = self.health().saturating_sub(amount);
        self.set_health(new);
    }

    fn set_health(&mut self, new: i32);

    fn is_broken(&self) -> bool {
        self.health() <= 0
    }

    fn remaining_ratio(&self) -> f32 {
        self.health() as f32 / self.max_health() as f32
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Tool {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub owner_id: String,

    pub tool_type: ToolType,
    pub tool_target: ToolTarget,
    pub name: String,         // Name of the tool
    pub description: String,  // Description of the tool
    pub image_url: String,    // Image URL of the tool
    pub impact: i32,          // Damage or support amount
    pub health: i32,          // Health of the tool
    pub max_health: i32,      // Max health of the tool
    pub degrade_per_use: i32, // Amount to degrade the tool per use
}

impl HaveLifetime for Tool {
    fn health(&self) -> i32 {
        self.health
    }

    fn max_health(&self) -> i32 {
        self.max_health
    }

    fn set_health(&mut self, new: i32) {
        self.health = new;
    }
}

impl Tool {
    pub fn builder(owner_id: impl Into<String>) -> ToolBuilder {
        ToolBuilder::new(owner_id)
    }
    pub fn degrade(&mut self, amount: i32) {
        HaveLifetime::degrade(self, amount);
    }
}

pub struct ToolBuilder {
    owner_id: String,
    name: Option<String>,
    description: Option<String>,
    image_url: Option<String>,
    impact: Option<i32>,
    health: i32,
    max_health: i32,
    degrade_per_use: i32,
    tool_type: Option<ToolType>,
    tool_target: Option<ToolTarget>,
}

impl ToolBuilder {
    pub fn new(owner_id: impl Into<String>) -> Self {
        Self {
            owner_id: owner_id.into(),
            name: None,
            description: None,
            image_url: None,
            impact: None,
            health: 10_000,
            max_health: 10_000,
            degrade_per_use: 1,
            tool_type: None,
            tool_target: None,
        }
    }

    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    pub fn description(mut self, desc: impl Into<String>) -> Self {
        self.description = Some(desc.into());
        self
    }

    pub fn image_url(mut self, url: impl Into<String>) -> Self {
        self.image_url = Some(url.into());
        self
    }

    pub fn impact(mut self, impact: i32) -> Self {
        self.impact = Some(impact);
        self
    }

    pub fn degrade_per_use(mut self, amount: i32) -> Self {
        self.degrade_per_use = amount;
        self
    }

    pub fn tool_type(mut self, tool_type: ToolType) -> Self {
        self.tool_type = Some(tool_type);
        self
    }

    pub fn tool_target(mut self, tool_target: ToolTarget) -> Self {
        self.tool_target = Some(tool_target);
        self
    }

    pub fn build(self) -> Tool {
        Tool {
            id: None,
            owner_id: self.owner_id,
            tool_type: self.tool_type.expect("Tool type missing"),
            tool_target: self.tool_target.expect("Tool target missing"),
            name: self.name.expect("Tool name missing"),
            description: self.description.expect("Tool description missing"),
            image_url: self.image_url.expect("Tool image URL missing"),
            impact: self.impact.expect("Tool impact missing"),
            health: self.health,
            max_health: self.max_health,
            degrade_per_use: self.degrade_per_use,
        }
    }
}
