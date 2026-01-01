use super::post::PostRelation;
use super::post::Side;
use crate::constants::PARAMS;
use crate::math::vote_cost::{base_voter_cost, cost_in_bling, post_curve_cost};
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// USER ACCOUNTS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Copy, PartialEq, Eq, Debug, Clone)]
pub struct VoterAccountAttackSurface {
    pub enabled: bool,
    // future:
    pub surface_1: i16,
    pub surface_2: i16,
    pub surface_3: i16,
    pub surface_4: i16,
    pub surface_5: i16,
    pub surface_6: i16,
    pub surface_7: i16,
    pub surface_8: i16,
    pub surface_9: i16,
    pub padding: [u8; 31],
}

impl VoterAccountAttackSurface {
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            surface_1: 10_000,
            surface_2: 10_000,
            surface_3: 10_000,
            surface_4: 10_000,
            surface_5: 10_000,
            surface_6: 10_000,
            surface_7: 10_000,
            surface_8: 10_000,
            surface_9: 10_000,
            padding: [0; 31],
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct VoterAccount {
    pub voter: Pubkey,     // voter wallet pubkey
    pub social_score: i64, // can drive withdraw penalty etc.
    pub attack_surface: VoterAccountAttackSurface,
    pub bump: u8,
}

impl VoterAccount {
    pub fn default(voter: Pubkey, bump: u8) -> Self {
        Self {
            voter,
            social_score: PARAMS.voter_initial_social_score,
            attack_surface: VoterAccountAttackSurface::new(true),
            bump,
        }
    }

    pub fn new(
        voter: Pubkey,
        social_score: i64,
        attack_surface: VoterAccountAttackSurface,
        bump: u8,
    ) -> Self {
        Self {
            voter,
            social_score,
            attack_surface,
            bump,
        }
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

        // Convert to BLING lamports
        cost_in_bling(post_cost)
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
