use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

// These will never be changed

pub const PRECISION: u64 = 1_000_000; // 1e6 fixed-point scale

/// Maximum vote count cap for overflow prevention in cost calculations
/// Used to cap votes, previous votes, and post votes to prevent u64 overflow
pub const MAX_VOTE_COUNT_CAP: u64 = 1_000_000;

pub const USDC_LAMPORTS_PER_USDC: u64 = 1_000_000;

pub const SMACK_TO_PUMP_PRICE_RATIO: u64 = 10;

pub struct PayoutParams {
    pub protocol_vote_fee_bps: u16,
    pub protocol_vote_settlement_fee_bps: u16,
    pub creator_pump_fee_bps: u16,
    pub creator_pump_win_settlement_fee_bps: u16,
    // vote-tokenomics constants
    pub bling_per_vote_base_cost: u64,
    // voter constants
    pub voter_initial_social_score: i64,
}

pub const PARAMS: PayoutParams = PayoutParams {
    protocol_vote_fee_bps: 100, // 1% of every vote goes to the protocol
    protocol_vote_settlement_fee_bps: 100, // 1% of every vote goes to the protocol
    creator_pump_fee_bps: 100,  // 1% of every pump vote goes to the creator
    creator_pump_win_settlement_fee_bps: 40, // 40% of the pot goes to the creator when the post is settled in favour of pump
    bling_per_vote_base_cost: 1 * LAMPORTS_PER_SOL, // 1 vote = 1 * LAMPORTS_PER_SOL by default
    voter_initial_social_score: 10_000, // 10_000 by default - already have room to decrease and die of bankruptcy
};
