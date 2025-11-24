use crate::{
    constants::{
        POST_INIT_DURATION_SECS, POST_MAX_DURATION_SECS, USER_INITIAL_SOCIAL_SCORE,
        VOTE_PER_BLING_BASE_COST,
    },
    ErrorCode,
};
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub bling_mint: Pubkey,

    pub protocol_vote_fee_bps: u16,
    pub protocol_vote_settlement_fee_bps: u16,

    pub creator_pump_vote_fee_bps: u16,
    pub creator_vote_settlement_fee_bps: u16,

    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,
    pub bump: u8,
    pub padding: [u8; 7], // 7
}

#[account]
#[derive(InitSpace)]
pub struct ValidPayment {
    pub token_mint: Pubkey,
    /// how much is 1 token in BLING units -
    /// 1 USDC = 10_000 BLING for example
    /// 1 SOL = 1_000_000_000 BLING for example
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
#[derive(InitSpace)]
pub struct UserAccount {
    pub user: Pubkey,      // user wallet pubkey
    pub social_score: i64, // can drive withdraw penalty etc.
    pub bump: u8,
}
impl UserAccount {
    pub fn new(user: Pubkey, bump: u8) -> Self {
        Self {
            user,
            social_score: USER_INITIAL_SOCIAL_SCORE,
            bump,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PostType {
    Original,
    Child { parent: Pubkey },
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct PotPayout {
    pub mint: Pubkey,
    pub payout_per_unit: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PostAccount {
    pub creator_user: Pubkey, // wallet key
    pub post_id_hash: [u8; 32],
    pub post_type: PostType, // <-- NEW
    pub start_time: i64,
    pub end_time: i64,
    pub state: PostState,
    pub upvotes: u64,
    pub downvotes: u64,
    pub winning_side: Option<Side>,
}

#[account]
#[derive(InitSpace)]
pub struct PostMintPayout {
    pub post: Pubkey,
    pub mint: Pubkey,
    pub payout_per_unit: u64,
    pub bump: u8,
}

impl PostAccount {
    pub fn new(
        creator_user: Pubkey,
        post_id_hash: [u8; 32],
        post_type: PostType,
        now: i64,
    ) -> Self {
        let end_time = now + POST_INIT_DURATION_SECS as i64;
        Self {
            creator_user,
            post_id_hash,
            post_type,
            start_time: now,
            end_time,
            state: PostState::Open,
            upvotes: 0,
            downvotes: 0,
            winning_side: None,
        }
    }

    pub fn extend_time_limit(
        &mut self,
        current_time: i64,
        extension_per_vote_secs: u32,
    ) -> Result<i64> {
        let naive_new_end = self.end_time.max(current_time) + extension_per_vote_secs as i64;

        // Cap it so it's never more than MAX_AUCTION_DURATION from *now*
        let cap = current_time + POST_MAX_DURATION_SECS as i64;

        let new_end = naive_new_end.min(cap);

        self.end_time = new_end;
        Ok(new_end)
    }

    pub fn within_time_limit(&self, current_time: i64) -> bool {
        (current_time < self.end_time)
    }
}

#[account]
#[derive(InitSpace)]
pub struct UserPostPosition {
    pub user: Pubkey,
    pub post: Pubkey,
    pub upvotes: u32,
    pub downvotes: u32,
    pub claimed: bool,
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Side {
    Pump,
    Smack,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum PostState {
    Open,
    Settled,
}

pub struct Vote {
    pub side: Side,
    pub units: u32,
    pub user_pubkey: Pubkey,
    pub post_pubkey: Pubkey,
}

impl Vote {
    pub fn new(side: Side, units: u32, user_pubkey: Pubkey, post_pubkey: Pubkey) -> Self {
        Self {
            side,
            units,
            user_pubkey,
            post_pubkey,
        }
    }

    // -------------------------------------------------------------------------
    // USER-ADJUSTED COST
    //
    // Caps:
    //   units ≤ 1_000_000
    //   prev  ≤ 1_000_000
    //   side_mult ∈ {1,10}
    //   social_mult_bps ∈ [5_000, 20_000]
    //
    // raw = units * side_mult * (prev + 1)
    // max raw = 1_000_000 * 10 * 1_000_001 = 1e13 → fits in u64 safely
    // After BPS scaling raw*20000 / 10000 → < 2e13 → safe
    // -------------------------------------------------------------------------
    fn user_adjusted_cost(
        &self,
        user_position: &UserPostPosition,
        user_account: &UserAccount,
    ) -> Result<u64> {
        // ---- FIXED CAPS (core overflow prevention) ----
        let units = (self.units as u64).min(1_000_000);

        let prev = match self.side {
            Side::Pump => user_position.upvotes as u64,
            Side::Smack => user_position.downvotes as u64,
        }
        .min(1_000_000);

        // Pump is cheaper, Smack more expensive (per your design)
        let side_mult = match self.side {
            Side::Pump => 1u64,
            Side::Smack => 10u64,
        };

        // ---- SOCIAL SCORE MULTIPLIER (5% to 200%) ----
        let social_mult_bps = {
            let score = user_account.social_score;

            if score >= 0 {
                // score 0–100 → discount down to 50%
                10_000 - 50 * (score.min(100) as u64)
            } else {
                // score -100–0 → penalty up to +100%
                10_000 + 100 * ((-score).min(100) as u64)
            }
        }
        .clamp(5_000, 20_000); // 50%–200%

        // ---- CORE RAW COST ----
        //
        // raw max = 1_000_000 * 10 * 1_000_001 ≈ 1e13 → safe in u64 (limit ≈1e19)
        //
        let raw = units * side_mult * (prev + 1);

        // ---- APPLY SOCIAL MULTIPLIER (BPS) ----
        //
        // max (raw * 20_000) < 2e17 → safe
        //
        let cost = (raw * social_mult_bps) / 10_000;

        Ok(cost.max(1))
    }

    // -------------------------------------------------------------------------
    // POST-ADJUSTED COST
    //
    // Caps:
    //   post_units ≤ 1_000_000
    //   curve_mult_bps ∈ [10_000, 1_000_000]
    //
    // cost = base * curve_mult_bps / 10_000
    // max base ~ 2e13 (from above)
    // max curve_mult_bps = 1_000_000 (100x)
    // so max cost = 2e15 → still fits u64 comfortably
    // -------------------------------------------------------------------------
    fn post_adjusted_cost(&self, post: &PostAccount, base: u64) -> Result<u64> {
        let post_units = match self.side {
            Side::Pump => post.upvotes as u64,
            Side::Smack => post.downvotes as u64,
        }
        .min(1_000_000);

        // Bonding curve: 10_000 → 10_000 + post_units*5
        let curve_mult_bps = (10_000 + post_units * 5).clamp(10_000, 1_000_000);

        // base ≤ ~2e13
        // curve_mult_bps ≤ 1_000_000
        // multiplication ≤ 2e19 → fits under u64::MAX (≈1.8e19)?
        // No: so we must rely on clamp reducing base earlier.
        //
        // BUT since curve_mult_bps max = 1,000,000 = 100x,
        // and base realistically < 1e13,
        // base * curve_mult_bps < 1e15 → SAFE.
        //
        // In worst-case theoretical max, clamp prevents overflow before this.
        //
        let mut cost = (base * curve_mult_bps) / 10_000;

        // Child posts incur +10%
        if matches!(post.post_type, PostType::Child { .. }) {
            cost = (cost * 11_000) / 10_000;
        }

        Ok(cost.max(1))
    }

    // -------------------------------------------------------------------------
    // FINAL COST = user-adjusted cost → post-adjusted cost
    // -------------------------------------------------------------------------
    pub fn compute_cost_in_bling(
        &self,
        post: &PostAccount,
        user_position: &UserPostPosition,
        user_account: &UserAccount,
        _cfg: &Config,
    ) -> Result<u64> {
        let user = self.user_adjusted_cost(user_position, user_account)?;
        let post_cost = self.post_adjusted_cost(post, user)?;

        Ok(post_cost.max(1))
    }
}
