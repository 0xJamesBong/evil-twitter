// Core principle (do not violate this)

// Weapons are not objects.
// Defenses are not objects.
// They are effects applied under rules.

// Objects (NFTs, items, names) are licenses to emit effects.

// Everything below follows from that.

pub enum ModifierCategory {
    Cosmetic,     // visible only
    Economic,     // affect vote costs exchange rates
    Reputational, // affect social score
    Control,      // disables, gates, caps
}
pub enum ModifierTarget {
    User,
    Post,
    Organization,
    Tools,
}

pub enum ModifierStyle {
    Curse,
    Honour,
    Slur,
    Medicine,
    Shield,
}
pub enum UserEffectField {
    VoteCost,
    ExchangeRate,
    SocialScore,
    AttackSurface(u8), // maps to surface_1..surface_9
}

pub struct ModifierEffect {
    pub category: ModifierCategory,
    pub style: ModifierStyle,

    pub target: ModifierTarget, // User for now
    pub field: UserEffectField, // WHAT it affects
    pub magnitude: i16,         // HOW MUCH
}

pub enum StackRule {
    Add,
    Max,
    Min,
    Override,
}

#[account]
pub struct ActiveModifier {
    pub target: Pubkey, // user being affected
    pub issuer: Pubkey, // who applied it
    pub effect: ModifierEffect,
    pub stack_rule: StackRule,
    pub expires_at: i64,
}
