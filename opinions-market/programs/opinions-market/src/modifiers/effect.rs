/*!
 * Modifier system for NFTs.
 *
 * Core principle (do not violate this):
 * - Weapons are not objects.
 * - Defenses are not objects.
 * - They are effects applied under rules.
 *
 * Objects (NFTs, items, names) are licenses to emit effects.
 * Everything below follows from that.
 */

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum PermanentEffectCategory {
    Cosmetic,     // visible only
    Economic,     // affect vote costs exchange rates
    Reputational, // affect social score
    Control,      // disables, gates, caps
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum PermanentEffectTarget {
    User,
    // Post,
    // Organization,
    // Tools,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum PermanentEffectStyle {
    Curse,
    Honour,
    Slur,
    Medicine,
    Shield,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum UserEffectField {
    AppearanceFreshness,
    AppearanceCharisma,
    AppearanceOriginality,
    AppearanceNpcNess,
    AppearanceBeauty,
    AppearanceIntellectualism,
    BodyHealth,
    BodyEnergy,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum StackRule {
    Add, // adds magnitude as a delta to the base value
    Subtract, // subtracts magnitude as a delta from the base value
         // Max, // ensures value is the maximum possible value of the base
         // Min, // ensures value is the minimum possible value of the base
         // Override, //
}

// PermanentEffect is a write-time mutation command, not stored state.
// Effects are applied directly to canonical state at instruction time.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct PermanentEffect {
    pub category: PermanentEffectCategory,
    pub style: PermanentEffectStyle,
    pub target: PermanentEffectTarget,
    pub stack_rule: StackRule,
    pub field: UserEffectField,
    pub magnitude: i16,
}
