use super::tools::OMConfig;
use super::voter::{VoterAccount, VoterPostPosition};
use crate::math::vote_cost::{base_voter_cost, cost_in_bling, post_curve_cost};
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// POST ENUMS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum PostFunction {
    Normal,
    Question,
    Answer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum PostRelation {
    Root,
    Reply { parent: Pubkey },
    Quote { quoted: Pubkey },
    AnswerTo { question: Pubkey },
}

/// Forced settlement outcome for Answers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ForcedOutcome {
    Pump,
    Smack,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum Side {
    Pump,
    Smack,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PostState {
    Open,
    Settled,
}

// -----------------------------------------------------------------------------
// POST ACCOUNTS
// -----------------------------------------------------------------------------

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct PotPayout {
    pub mint: Pubkey,
    pub payout_per_vote: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PostAccount {
    pub function: PostFunction, // Normal / Question / Answer
    pub relation: PostRelation, // Root / Reply / Quote / AnswerTo

    // Forced settlement override (only for Answers)
    pub forced_outcome: Option<ForcedOutcome>,

    pub creator_user: Pubkey,
    pub post_id_hash: [u8; 32],

    pub start_time: i64,
    pub end_time: i64,

    pub state: PostState, // Open / Settled
    pub winning_side: Option<Side>,

    pub upvotes: u64,
    pub downvotes: u64,

    pub bump: u8,

    /// padding to prevent future breakage
    pub reserved: [u8; 32],
}

impl PostAccount {
    pub fn new(
        creator_user: Pubkey,
        post_id_hash: [u8; 32],
        function: PostFunction,
        relation: PostRelation,

        now: i64,
        om_config: &OMConfig,
        bump: u8,
    ) -> Self {
        let end_time = now + om_config.base_duration_secs as i64;
        Self {
            creator_user,
            post_id_hash,
            function,
            relation,
            forced_outcome: None,
            start_time: now,
            end_time,
            state: PostState::Open,
            upvotes: 0,
            downvotes: 0,
            winning_side: None,
            bump,
            reserved: [0; 32],
        }
    }

    pub fn extend_time_limit(
        &mut self,
        current_time: i64,
        votes: u32,
        om_config: &OMConfig,
    ) -> Result<i64> {
        let naive_new_end = self.end_time.max(current_time)
            + om_config.extension_per_vote_secs as i64 * votes as i64;

        // Cap it so it's never more than max_duration_secs from *now*
        let cap = current_time + om_config.max_duration_secs as i64;

        let new_end = naive_new_end.min(cap);

        self.end_time = new_end;
        Ok(new_end)
    }

    pub fn within_time_limit(&self, current_time: i64) -> bool {
        current_time < self.end_time
    }
}

#[account]
#[derive(InitSpace, PartialEq, Eq, Debug)]
pub struct PostMintPayout {
    pub post: Pubkey,
    pub token_mint: Pubkey,
    pub initial_pot: u64,  // Total pot before any fees
    pub total_payout: u64, // Amount for voters (after all fees)
    pub payout_per_winning_vote: u64,
    pub creator_fee: u64,
    pub protocol_fee: u64,
    pub mother_fee: u64,
    pub frozen: bool, // Prevents re-settlement
    pub bump: u8,
}

impl PostMintPayout {
    pub fn new(
        post: Pubkey,
        token_mint: Pubkey,
        initial_pot: u64,
        total_payout: u64,
        payout_per_winning_vote: u64,
        creator_fee: u64,
        protocol_fee: u64,
        mother_fee: u64,
        bump: u8,
    ) -> Self {
        Self {
            post,
            token_mint,
            initial_pot,
            total_payout,
            payout_per_winning_vote,
            creator_fee,
            protocol_fee,
            mother_fee,
            frozen: true, // Always frozen when created
            bump,
        }
    }
}

// -----------------------------------------------------------------------------
// VOTE
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub struct Vote {
    pub side: Side,
    pub votes: u64,
    pub user_pubkey: Pubkey,
    pub post_pubkey: Pubkey,
}

impl Vote {
    pub fn new(side: Side, votes: u64, user_pubkey: Pubkey, post_pubkey: Pubkey) -> Self {
        Self {
            side,
            votes,
            user_pubkey,
            post_pubkey,
        }
    }

    // -------------------------------------------------------------------------
    // FINAL COST = user-adjusted cost → post-adjusted cost → scaled to BLING
    // Uses shared pricing module for consistency
    // -------------------------------------------------------------------------
    pub fn compute_cost_in_bling(
        &self,
        post: &PostAccount,
        user_position: &VoterPostPosition,
        voter_account: &VoterAccount,
    ) -> Result<u64> {
        // Calculate base user-adjusted cost
        let prev = match self.side {
            Side::Pump => user_position.upvotes as u64,
            Side::Smack => user_position.downvotes as u64,
        };

        let base_cost = base_voter_cost(self.votes as u64, prev, self.side, voter_account)?;

        // Apply post curve adjustments
        let post_cost = post_curve_cost(
            base_cost,
            post.upvotes as u64,
            post.downvotes as u64,
            self.side,
            post.relation.clone(),
        )?;

        // Convert to BLING lamports
        cost_in_bling(post_cost)
    }
}
