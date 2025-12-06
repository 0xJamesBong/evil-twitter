use crate::constants::{MAX_VOTE_COUNT_CAP, PARAMS};
use crate::math::vote_cost::{base_user_cost, cost_in_bling, post_curve_cost};
use crate::ErrorCode;
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct Config {
    pub admin: Pubkey,
    pub payer_authroity: Pubkey,
    pub bling_mint: Pubkey,

    // pub protocol_vote_fee_bps: u16,
    // pub protocol_vote_settlement_fee_bps: u16,

    // pub creator_pump_vote_fee_bps: u16,
    // pub creator_vote_settlement_fee_bps: u16,
    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,

    // pub vote_per_bling_base_cost: u64,
    // /// 1 vote = 1 * LAMPORTS_PER_SOL by default
    // pub user_initial_social_score: i64,
    /// 10_000 by default
    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl Config {
    pub fn new(
        admin: Pubkey,
        payer_authroity: Pubkey,
        bling_mint: Pubkey,
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
        bump: u8,
        padding: [u8; 7],
    ) -> Self {
        Self {
            admin,
            payer_authroity,
            bling_mint,
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            bump,
            padding,
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct SessionAuthority {
    pub user: Pubkey,              // wallet being delegated
    pub session_key: Pubkey,       // ephemeral pubkey authorized to act
    pub expires_at: i64,           // timestamp
    pub privileges_hash: [u8; 32], // optional whitelist hash
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct ValidPayment {
    pub token_mint: Pubkey,
    /// how much is 1 token in BLING votes -
    /// 1 USDC = 10_000 BLING for example
    /// 1 SOL = 1_000_000_000 BLING for example
    /// This value is lamport-free. So 1 BLING = 1 BLING
    pub price_in_bling: u64,
    pub enabled: bool,
    pub bump: u8,
}
impl ValidPayment {
    pub fn new(token_mint: Pubkey, price_in_bling: u64, enabled: bool) -> Self {
        Self {
            token_mint,
            price_in_bling,
            enabled,
            bump: 0,
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct UserAccount {
    pub user: Pubkey,      // user wallet pubkey
    pub social_score: i64, // can drive withdraw penalty etc.
    pub bump: u8,
}
impl UserAccount {
    pub fn new(user: Pubkey, bump: u8) -> Self {
        Self {
            user,
            social_score: PARAMS.user_initial_social_score,
            bump,
        }
    }

    /// Calculate canonical vote cost for this user
    /// This is the cost of voting on a "boring" post (0 votes) with no previous votes,
    /// but using the user's actual social score. This is a pure user attribute.
    pub fn canonical_cost(&self, side: Side) -> Result<u64> {
        // Canonical scenario: 1 vote, no previous votes, boring post (0 votes, original type)
        let base_cost = base_user_cost(
            1, // 1 vote
            0, // no previous votes
            side, self, // user account (for social score)
        )?;

        // Apply post curve adjustments (for canonical: 0 votes, original type)
        let post_cost = post_curve_cost(
            base_cost,
            0, // post_upvotes
            0, // post_downvotes
            side,
            PostType::Original,
        )?;

        // Convert to BLING lamports
        cost_in_bling(post_cost)
    }
}
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PostFunction {
    Normal,
    Question,
    Answer,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PostRelation {
    Root,
    Reply { parent: Pubkey },
    Quote { quoted: Pubkey },
    AnswerTo { question: Pubkey },
}

/// Forced settlement outcome for Answers
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ForcedOutcome {
    Pump,
    Smack,
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct PotPayout {
    pub mint: Pubkey,
    pub payout_per_vote: u64,
}

#[account]
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
        config: &Config,
        bump: u8,
    ) -> Self {
        let end_time = now + config.base_duration_secs as i64;
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
        config: &Config,
    ) -> Result<i64> {
        let naive_new_end =
            self.end_time.max(current_time) + config.extension_per_vote_secs as i64 * votes as i64;

        // Cap it so it's never more than max_duration_secs from *now*
        let cap = current_time + config.max_duration_secs as i64;

        let new_end = naive_new_end.min(cap);

        self.end_time = new_end;
        Ok(new_end)
    }

    pub fn within_time_limit(&self, current_time: i64) -> bool {
        (current_time < self.end_time)
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

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct UserPostPosition {
    pub user: Pubkey,
    pub post: Pubkey,
    pub upvotes: u64,
    pub downvotes: u64,
}

impl UserPostPosition {
    pub fn new(user: Pubkey, post: Pubkey) -> Self {
        Self {
            user,
            post,
            upvotes: 0,
            downvotes: 0,
        }
    }
}

// For reward claims - token mint specific
#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct UserPostMintClaim {
    pub user: Pubkey,
    pub post: Pubkey,
    pub mint: Pubkey,
    pub claimed: bool,
    pub bump: u8,
}

impl UserPostMintClaim {
    pub fn new(user: Pubkey, post: Pubkey, mint: Pubkey, bump: u8) -> Self {
        Self {
            user,
            post,
            mint,
            claimed: false,
            bump,
        }
    }
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

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
        user_position: &UserPostPosition,
        user_account: &UserAccount,
    ) -> Result<u64> {
        // Calculate base user-adjusted cost
        let prev = match self.side {
            Side::Pump => user_position.upvotes as u64,
            Side::Smack => user_position.downvotes as u64,
        };

        let base_cost = base_user_cost(self.votes as u64, prev, self.side, user_account)?;

        // Apply post curve adjustments
        let post_cost = post_curve_cost(
            base_cost,
            post.upvotes as u64,
            post.downvotes as u64,
            self.side,
            post.post_type,
        )?;

        // Convert to BLING lamports
        cost_in_bling(post_cost)
    }
}
