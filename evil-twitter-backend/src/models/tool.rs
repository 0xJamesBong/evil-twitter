use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::models::tweet::{Tweet, TweetAttackAction};

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

/// Trait representing something that can act on a Tweet
pub trait UseOnTweet {
    fn use_on_tweet(&mut self, tweet: &mut Tweet);
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Weapon {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub id: Option<ObjectId>,

    #[schema(value_type = String, example = "507f1f77bcf86cd799439011")]
    pub owner_id: String,

    pub name: String,
    pub description: String,
    pub image_url: String,
    pub damage: i32,
    pub health: i32,
    pub max_health: i32,
    pub degrade_per_use: i32,
}

impl HaveLifetime for Weapon {
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

impl UseOnTweet for Weapon {
    fn use_on_tweet(&mut self, tweet: &mut Tweet) {
        if self.is_broken() {
            println!("Weapon is broken, and cannot be used");
            return;
        }
        let damage = self.damage;
        let health_before = tweet.health.current;
        let health_after = health_before.saturating_sub(damage);

        tweet.health.current = health_after;

        // Record the attack in history of the tweet
        let attack = TweetAttackAction {
            timestamp: mongodb::bson::DateTime::now(),
            amount: damage,
            health_before,
            health_after,
        };
        tweet.health.history.attack_history.push(attack);

        // Degrade the weapon
        self.degrade(damage);

        println!(
            "{} attacked tweet {:?}, health: {} → {}",
            self.name, tweet.id, health_before, health_after
        );
    }
}

impl Weapon {
    pub fn builder(owner_id: impl Into<String>) -> WeaponBuilder {
        WeaponBuilder {
            owner_id: owner_id.into(),
            name: None,
            description: None,
            image_url: None,
            damage: None,
            health: 10000,
            max_health: 10000,
            degrade_per_use: 1,
        }
    }
}

pub struct WeaponBuilder {
    owner_id: String,
    name: Option<String>,
    description: Option<String>,
    image_url: Option<String>,
    damage: Option<i32>,
    health: i32,
    max_health: i32,
    degrade_per_use: i32,
}

impl WeaponBuilder {
    pub fn name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    pub fn image_url(mut self, image_url: impl Into<String>) -> Self {
        self.image_url = Some(image_url.into());
        self
    }

    pub fn damage(mut self, damage: i32) -> Self {
        self.damage = Some(damage);
        self
    }

    pub fn build(self) -> Weapon {
        Weapon {
            id: None,
            owner_id: self.owner_id,
            name: self.name.unwrap(),
            description: self.description.unwrap(),
            image_url: self.image_url.unwrap(),
            damage: self.damage.unwrap(),
            health: self.health,
            max_health: self.max_health,
            degrade_per_use: self.degrade_per_use,
        }
    }
}
