use crate::constants::{MAX_VOTE_COUNT_CAP, PARAMS, SMACK_TO_PUMP_PRICE_RATIO};
use crate::states::{PostRelation, Side, VoterAccount};
use crate::ErrorCode;
use anchor_lang::prelude::*;

/// Calculate social score multiplier from voter account
/// Returns multiplier in basis points (BPS): 5_000 (50%) to 20_000 (200%)
///
/// Formula:
/// - score 10000 → 10_000 BPS (100% = 1.0x multiplier)
/// - score 0 → 20_000 BPS (200% = 2.0x multiplier)
/// - score -100 → 5_000 BPS (50% = 0.5x multiplier)
pub fn social_score_multiplier(voter_account: &VoterAccount) -> Result<u64> {
    let score = voter_account.social_score;

    let mult_bps = if score >= 0 {
        // score 0 → 20_000 BPS (200% = 2.0x)
        // score 10000 → 10_000 BPS (100% = 1.0x)
        // Linear interpolation: 20_000 - (score / 10000) * 10_000
        // At score 0: 20_000 - 0 = 20_000
        // At score 10000: 20_000 - 10_000 = 10_000
        let score_clamped = score.min(10_000) as u64;
        20_000 - (score_clamped * 10_000) / 10_000
    } else {
        // score -100–0 → penalty up to 200%
        // score -100 → 20_000 BPS (200% = 2.0x)
        // score 0 → 10_000 BPS (100% = 1.0x)
        // Linear interpolation: 10_000 + ((-score) / 100) * 10_000
        let neg_score_clamped = (-score).min(100) as u64;
        10_000 + (neg_score_clamped * 10_000) / 100
    };

    Ok(mult_bps.clamp(5_000, 20_000))
}

/// Calculate base voter-adjusted cost
/// This is the core "unadjusted base cost" before post adjustments
///
/// Parameters:
/// - votes: Number of votes being cast
/// - prev: Previous votes on this side (for this voter on this post)
/// - side: Pump or Smack
/// - voter_account: User account for social score
pub fn base_voter_cost(
    votes: u64,
    prev: u64,
    side: Side,
    voter_account: &VoterAccount,
) -> Result<u64> {
    // ---- FIXED CAPS (core overflow prevention) ----
    let votes = votes.min(MAX_VOTE_COUNT_CAP);
    let prev = prev.min(MAX_VOTE_COUNT_CAP);

    // Pump is cheaper, Smack more expensive
    // Smack cost is SMACK_TO_PUMP_PRICE_RATIO times the pump cost
    let side_mult = match side {
        Side::Pump => 1u64,
        Side::Smack => SMACK_TO_PUMP_PRICE_RATIO,
    };

    // ---- CORE RAW COST ----
    // raw = votes * side_mult * (prev + 1)
    // max raw = MAX_VOTE_COUNT_CAP * SMACK_TO_PUMP_PRICE_RATIO * (MAX_VOTE_COUNT_CAP + 1) ≈ 1e13 → safe in u64
    let raw = votes * side_mult * (prev + 1);

    // ---- APPLY SOCIAL MULTIPLIER (BPS) ----
    // max (raw * 20_000) < 2e17 → safe
    let social_mult = social_score_multiplier(voter_account)?;
    let voter_adjusted = (raw * social_mult) / 10_000;

    Ok(voter_adjusted.max(1))
}

/// Apply post bonding curve adjustments to the base cost
///
/// Parameters:
/// - unadjusted_cost: Base cost from base_voter_cost
/// - post_upvotes: Number of upvotes on the post
/// - post_downvotes: Number of downvotes on the post
/// - side: Pump or Smack (determines which vote count to use)
/// - relation: PostRelation (child posts get +10%)
pub fn post_curve_cost(
    unadjusted_cost: u64,
    post_upvotes: u64,
    post_downvotes: u64,
    side: Side,
    relation: PostRelation,
) -> Result<u64> {
    let post_votes = match side {
        Side::Pump => post_upvotes,
        Side::Smack => post_downvotes,
    }
    .min(MAX_VOTE_COUNT_CAP);

    // Bonding curve: 10_000 → 10_000 + post_votes*5
    let curve_mult_bps = (10_000 + post_votes * 5).clamp(10_000, MAX_VOTE_COUNT_CAP);

    let mut cost = (unadjusted_cost * curve_mult_bps) / 10_000;

    // Child posts (Reply, Quote, AnswerTo) incur +10%
    if matches!(
        relation,
        PostRelation::Reply { .. } | PostRelation::Quote { .. } | PostRelation::AnswerTo { .. }
    ) {
        cost = (cost * 11_000) / 10_000;
    }

    Ok(cost.max(1))
}

/// Convert vote cost from vote units to dollar lamports
/// Applies the base cost multiplier and ensures minimum cost
pub fn cost_in_dollar(raw_cost: u64) -> Result<u64> {
    let cost = raw_cost
        .checked_mul(PARAMS.dollar_per_vote_base_cost)
        .ok_or(ErrorCode::MathOverflow)?;

    // Minimum cost is 1 SOL worth of dollars
    Ok(cost.max(PARAMS.dollar_per_vote_base_cost))
}
