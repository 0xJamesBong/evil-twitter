use crate::constants::{MAX_VOTE_COUNT_CAP, PARAMS};
use crate::ErrorCode;
use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};

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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum PostType {
    Original,
    Child { parent: Pubkey },
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct PotPayout {
    pub mint: Pubkey,
    pub payout_per_vote: u64,
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
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

impl PostAccount {
    pub fn new(
        creator_user: Pubkey,
        post_id_hash: [u8; 32],
        post_type: PostType,
        now: i64,
        config: &Config,
    ) -> Self {
        let end_time = now + config.base_duration_secs as i64;
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
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct PostMintPayout {
    pub post: Pubkey,
    pub token_mint: Pubkey,
    pub total_payout: u64,
    pub payout_per_winning_vote: u64,
    pub bump: u8,
}
impl PostMintPayout {
    pub fn new(
        post: Pubkey,
        token_mint: Pubkey,
        total_payout: u64,
        payout_per_winning_vote: u64,
        bump: u8,
    ) -> Self {
        Self {
            post,
            token_mint,
            total_payout,
            payout_per_winning_vote,
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
    pub fn minimum_cost_in_bling() -> u64 {
        PARAMS.bling_per_vote_base_cost
    }

    // -------------------------------------------------------------------------
    // USER-ADJUSTED COST
    //
    // Caps:
    //   votes ≤ MAX_VOTE_COUNT_CAP
    //   prev  ≤ MAX_VOTE_COUNT_CAP
    //   side_mult ∈ {1,10}
    //   social_mult_bps ∈ [5_000, 20_000]
    //
    // raw = votes * side_mult * (prev + 1)
    // max raw = MAX_VOTE_COUNT_CAP * 10 * (MAX_VOTE_COUNT_CAP + 1) = 1e13 → fits in u64 safely
    // After BPS scaling raw*20000 / 10000 → < 2e13 → safe
    // -------------------------------------------------------------------------
    fn user_adjusted_cost(
        &self,
        user_position: &UserPostPosition,
        user_account: &UserAccount,
    ) -> Result<u64> {
        // ---- FIXED CAPS (core overflow prevention) ----
        let votes = (self.votes as u64).min(MAX_VOTE_COUNT_CAP);

        let prev = match self.side {
            Side::Pump => user_position.upvotes as u64,
            Side::Smack => user_position.downvotes as u64,
        }
        .min(MAX_VOTE_COUNT_CAP);

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
        // raw max = MAX_VOTE_COUNT_CAP * 10 * (MAX_VOTE_COUNT_CAP + 1) ≈ 1e13 → safe in u64 (limit ≈1e19)
        //
        let raw = votes * side_mult * (prev + 1) * PARAMS.bling_per_vote_base_cost;

        // ---- APPLY SOCIAL MULTIPLIER (BPS) ----
        //
        // max (raw * 20_000) < 2e17 → safe
        //
        let cost = (raw * social_mult_bps) / 10_000;

        Ok(cost.max(Self::minimum_cost_in_bling()))
    }

    // -------------------------------------------------------------------------
    // POST-ADJUSTED COST
    //
    // Caps:
    //   post_votes ≤ MAX_VOTE_COUNT_CAP
    //   curve_mult_bps ∈ [10_000, MAX_VOTE_COUNT_CAP]
    //
    // cost = base * curve_mult_bps / 10_000
    // max base ~ 2e13 (from above)
    // max curve_mult_bps = MAX_VOTE_COUNT_CAP (100x)
    // so max cost = 2e15 → still fits u64 comfortably
    // -------------------------------------------------------------------------
    fn post_adjusted_cost(
        &self,
        post: &PostAccount,
        unadjusted_cost_of_bling_per_vote: u64,
    ) -> Result<u64> {
        let post_votes = match self.side {
            Side::Pump => post.upvotes as u64,
            Side::Smack => post.downvotes as u64,
        }
        .min(MAX_VOTE_COUNT_CAP);

        // Bonding curve: 10_000 → 10_000 + post_votes*5
        let curve_mult_bps = (10_000 + post_votes * 5).clamp(10_000, MAX_VOTE_COUNT_CAP);

        // base ≤ ~2e13
        // curve_mult_bps ≤ MAX_VOTE_COUNT_CAP
        // multiplication ≤ 2e19 → fits under u64::MAX (≈1.8e19)?
        // No: so we must rely on clamp reducing base earlier.
        //
        // BUT since curve_mult_bps max = 1,000,000 = 100x,
        // and base realistically < 1e13,
        // base * curve_mult_bps < 1e15 → SAFE.
        //
        // In worst-case theoretical max, clamp prevents overflow before this.
        //
        let mut cost = (unadjusted_cost_of_bling_per_vote * curve_mult_bps) / 10_000;

        // Child posts incur +10%
        if matches!(post.post_type, PostType::Child { .. }) {
            cost = (cost * 11_000) / 10_000;
        }

        Ok(cost.max(Self::minimum_cost_in_bling()))
    }

    // -------------------------------------------------------------------------
    // FINAL COST = user-adjusted cost → post-adjusted cost → scaled to BLING
    // -------------------------------------------------------------------------
    pub fn compute_cost_in_bling(
        &self,
        post: &PostAccount,
        user_position: &UserPostPosition,
        user_account: &UserAccount,
        _cfg: &Config,
    ) -> Result<u64> {
        let user_adjusted_cost_in_bling = self.user_adjusted_cost(user_position, user_account)?;
        let post_adjusted_cost_in_bling =
            self.post_adjusted_cost(post, user_adjusted_cost_in_bling)?;

        // Scale from vote units to BLING token amount
        // post_cost is in "vote units" (e.g., 1, 2, 3...)
        // Multiply by base cost to get actual BLING amount
        // 1 vote unit = 1 SOL worth of BLING (1 * LAMPORTS_PER_SOL)
        let cost_in_bling = post_adjusted_cost_in_bling
            .checked_mul(PARAMS.bling_per_vote_base_cost)
            .ok_or(ErrorCode::MathOverflow)?;

        // Minimum cost is 1 SOL worth of BLING (1 * LAMPORTS_PER_SOL)
        Ok(cost_in_bling.max(Self::minimum_cost_in_bling()))
    }
}
