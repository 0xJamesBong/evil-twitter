use mongodb::bson::DateTime;

use crate::models::{
    tool::Tool,
    tweet::{Tweet, TweetAttackAction, TweetSupportAction},
    user::User,
};

#[derive(Debug, Clone, Copy)]
pub enum ActionType {
    Attack,
    Support,
    // Defend,
}

/// Central “physics” function that mutates game state:
/// - applies damage/support
/// - records history
/// - degrades tools if used
pub struct ActionEngine;

impl ActionEngine {
    pub fn act_on_tweet(
        actor: &User,
        target_tweet: &mut Tweet,
        tool: Option<&mut Tool>,
        action_type: ActionType,
    ) {
        let now = DateTime::now();

        if tool.is_some() {
            // require!(
            //     tool.as_ref().unwrap().tool_target == ToolTarget::Tweet,
            //     "Tool target must be Tweet"
            // );
            // require!(
            //     tool.as_ref().unwrap().tool_type == ToolType::Weapon,
            //     "Tool type must be Weapon"
            // );
            // require!(
            //     tool.as_ref().unwrap().tool_type == ToolType::Defence,
            //     "Tool type must be Defence"
            // );
            // require!(
            //     tool.as_ref().unwrap().tool_type == ToolType::Support,
            //     "Tool type must be Support"
            // );
        }

        // 1️⃣ Compute base effect power (damage/support)
        let impact = if tool.is_some() {
            tool.as_ref().unwrap().impact as f64
        } else {
            match action_type {
                ActionType::Attack => 1.0,
                ActionType::Support => 2.0,
                // ActionType::Defend => 1.0,
            }
        };

        // 2️⃣ Apply the effect to the target
        let tool_name = tool.as_ref().map(|t| (*t).name.clone());
        match action_type {
            ActionType::Attack => {
                let attack_action = TweetAttackAction {
                    timestamp: now,
                    impact,
                    user_id: actor.id.clone().unwrap(),
                    tool: tool.as_ref().map(|t| (*t).clone()),
                };

                target_tweet.energy_state.record_attack(attack_action);
            }
            ActionType::Support => {
                let support_action = TweetSupportAction {
                    timestamp: now,
                    impact,
                    user_id: actor.id.clone().unwrap(),
                    tool: tool.as_ref().map(|t| (*t).clone()),
                };

                target_tweet.energy_state.record_support(support_action);
            }
        }

        // 3️⃣ Degrade tool if used
        if let Some(t) = tool {
            let degrade_amount = t.degrade_per_use;
            t.degrade(degrade_amount);
        }

        // 4️⃣ (Optional) Print debug log
        println!(
            "[ACTION] {:?} by {} on tweet {} → impact: {:.2}, tool: {:?}",
            action_type,
            actor.username,
            target_tweet.id.clone().unwrap().to_string(),
            impact,
            tool_name
        );
    }
}
