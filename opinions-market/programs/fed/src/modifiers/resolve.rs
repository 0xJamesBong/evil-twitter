use crate::effects::types::{ActiveModifier, StackRule, UserEffectField};

pub fn resolve_user_effect(
    base: i64,
    effects: impl Iterator<Item = &ActiveModifier>,
    field: UserEffectField,
    now: i64,
) -> i64 {
    let mut value = base;

    for effect in effects {
        if effect.expires_at <= now {
            continue;
        }
        if effect.effect.field != field {
            continue;
        }
        if effect.effect.category == ModifierCategory::Cosmetic {
            continue;
        }

        value = match effect.stack_rule {
            StackRule::Add => value + effect.effect.magnitude as i64,
            StackRule::Max => value.max(effect.effect.magnitude as i64),
            StackRule::Min => value.min(effect.effect.magnitude as i64),
            StackRule::Override => effect.effect.magnitude as i64,
        };
    }

    value
}
