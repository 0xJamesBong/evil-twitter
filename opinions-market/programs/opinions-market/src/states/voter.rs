use super::post::PostRelation;
use super::post::Side;
use crate::constants::PARAMS;
use crate::math::vote_cost::{base_voter_cost, cost_in_dollar, post_curve_cost};
use crate::modifiers::effect::{
    PermanentEffect, PermanentEffectCategory, StackRule, UserEffectField,
};
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// USER ACCOUNTS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Copy, PartialEq, Eq, Debug, Clone)]
pub struct Appearance {
    pub freshness: i16,
    pub charisma: i16,
    pub originality: i16,
    pub _npc_ness: i16,
    pub beauty: i16,
    pub intellectualism: i16,
    pub padding: [u8; 31],
}

impl Appearance {
    pub fn default() -> Self {
        Self {
            freshness: 20_000,
            charisma: 0,
            originality: 0,
            _npc_ness: 10_000,
            beauty: 0,
            intellectualism: 0,
            padding: [0; 31],
        }
    }
    pub fn new(
        freshness: i16,
        charisma: i16,
        originality: i16,
        _npc_ness: i16,
        beauty: i16,
        intellectualism: i16,
    ) -> Self {
        Self {
            freshness,
            charisma,
            originality,
            _npc_ness,
            beauty,
            intellectualism,
            padding: [0; 31],
        }
    }

    pub fn social_score(&self) -> (i64, i64) {
        let add = self.freshness as i64
            + self.charisma as i64
            + self.originality as i64
            + self.beauty as i64
            + self.intellectualism as i64;
        let subtract = self._npc_ness as i64;

        if add > subtract {
            return (add - subtract, 0);
        } else {
            // (0, 0) would be in this case.
            return (0, subtract - add);
        }
    }

    pub fn is_outcast(&self) -> bool {
        let (positive, negative) = self.social_score();
        if positive == 0 && negative > 0 {
            return true;
        } else {
            return false;
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Copy, PartialEq, Eq, Debug, Clone)]
pub struct Body {
    pub health: u16,
    pub energy: u16,

    pub padding: [u8; 31],
}

impl Body {
    pub fn default() -> Self {
        Self {
            health: 10_000,
            energy: 10_000,
            padding: [0; 31],
        }
    }
    pub fn new(health: u16, energy: u16) -> Self {
        Self {
            health: 10_000,
            energy: 10_000,
            padding: [0; 31],
        }
    }

    pub fn is_dead(&self) -> bool {
        self.health == 0
    }

    pub fn is_exhausted(&self) -> bool {
        self.energy == 0
    }
    pub fn resurrect(&self) -> Self {
        Self {
            health: 10_000,
            energy: 10_000,
            padding: [0; 31],
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct VoterAccount {
    pub voter: Pubkey, // voter wallet pubkey

    pub appearance: Appearance,
    pub body: Body,
    pub bump: u8,
}

impl VoterAccount {
    pub fn default(voter: Pubkey, bump: u8) -> Self {
        Self {
            voter,
            appearance: Appearance::default(),
            body: Body::default(),
            bump,
        }
    }

    pub fn new(voter: Pubkey, appearance: Appearance, body: Body, bump: u8) -> Self {
        Self {
            voter,
            appearance: appearance,
            body: body,
            bump,
        }
    }

    /// Apply a permanent effect directly to canonical state.
    /// Effects are applied at write-time, not resolved at read-time.
    pub fn apply_effect(&mut self, effect: PermanentEffect) {
        // Skip cosmetic effects (they don't mutate state)
        if effect.category == PermanentEffectCategory::Cosmetic {
            return;
        }

        match effect.field {
            UserEffectField::AppearanceFreshness => {
                Self::apply_i16(&mut self.appearance.freshness, effect);
            }
            UserEffectField::AppearanceCharisma => {
                Self::apply_i16(&mut self.appearance.charisma, effect);
            }
            UserEffectField::AppearanceOriginality => {
                Self::apply_i16(&mut self.appearance.originality, effect);
            }
            UserEffectField::AppearanceNpcNess => {
                Self::apply_i16(&mut self.appearance._npc_ness, effect);
            }
            UserEffectField::AppearanceBeauty => {
                Self::apply_i16(&mut self.appearance.beauty, effect);
            }
            UserEffectField::AppearanceIntellectualism => {
                Self::apply_i16(&mut self.appearance.intellectualism, effect);
            }
            UserEffectField::BodyHealth => {
                Self::apply_u16(&mut self.body.health, effect);
            }
            UserEffectField::BodyEnergy => {
                Self::apply_u16(&mut self.body.energy, effect);
            }
        }
    }

    fn apply_i16(field: &mut i16, effect: PermanentEffect) {
        match effect.stack_rule {
            StackRule::Add => {
                *field = field.saturating_add(effect.magnitude);
            }
            StackRule::Subtract => {
                *field = field.saturating_sub(effect.magnitude);
            }
        }
    }

    fn apply_u16(field: &mut u16, effect: PermanentEffect) {
        let m = effect.magnitude.max(0) as u16;
        match effect.stack_rule {
            StackRule::Add => {
                *field = field.saturating_add(m);
            }
            StackRule::Subtract => {
                *field = field.saturating_sub(m);
            }
        }
    }

    /// Compute social score from appearance fields
    /// Returns (positive_score, negative_score) as i64
    pub fn social_score(&self) -> (i64, i64) {
        self.appearance.social_score()
    }

    /// Calculate canonical vote cost for this voter
    /// This is the cost of voting on a "boring" post (0 votes) with no previous votes,
    /// but using the voter's actual social score. This is a pure voter attribute.
    pub fn canonical_cost(&self, side: Side) -> Result<u64> {
        // Canonical scenario: 1 vote, no previous votes, boring post (0 votes, original type)
        let base_cost = base_voter_cost(
            1, // 1 vote
            0, // no previous votes
            side, self, // voter account (for social score)
        )?;

        // Apply post curve adjustments (for canonical: 0 votes, original type)
        let post_cost = post_curve_cost(
            base_cost,
            0, // post_upvotes
            0, // post_downvotes
            side,
            PostRelation::Root,
        )?;

        // Convert to dollar lamports
        cost_in_dollar(post_cost)
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct VoterPostPosition {
    pub voter: Pubkey,
    pub post: Pubkey,
    pub upvotes: u64,
    pub downvotes: u64,
}

impl VoterPostPosition {
    pub fn new(voter: Pubkey, post: Pubkey) -> Self {
        Self {
            voter,
            post,
            upvotes: 0,
            downvotes: 0,
        }
    }
}

// For reward claims - token mint specific
#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct VoterPostMintClaim {
    pub voter: Pubkey,
    pub post: Pubkey,
    pub mint: Pubkey,
    pub claimed: bool,
    pub bump: u8,
}

impl VoterPostMintClaim {
    pub fn new(voter: Pubkey, post: Pubkey, mint: Pubkey, bump: u8) -> Self {
        Self {
            voter,
            post,
            mint,
            claimed: false,
            bump,
        }
    }
}
