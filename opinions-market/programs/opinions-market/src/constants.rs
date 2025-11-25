use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

// These will never be changed

pub const PRECISION: u64 = 1_000_000; // 1e6 fixed-point scale

pub struct PayoutParams {
    pub protocol_vote_fee_bps: u16,
    pub protocol_vote_settlement_fee_bps: u16,
    pub creator_pump_fee_bps: u16,
    pub creator_smuck_fee_bps: u16,
    // vote-tokenomics constants
    pub vote_per_bling_base_cost: u64,
    // user constants
    pub user_initial_social_score: i64,
}

pub const PARAMS: PayoutParams = PayoutParams {
    protocol_vote_fee_bps: 100, // 1% of every vote goes to the protocol
    protocol_vote_settlement_fee_bps: 100, // 1% of every vote goes to the protocol
    creator_pump_fee_bps: 100,  // 1% of every pump vote goes to the creator
    creator_smuck_fee_bps: 40,  // 40% of the pot goes to the creator when the post is settled
    vote_per_bling_base_cost: 1 * LAMPORTS_PER_SOL, // 1 vote = 1 * LAMPORTS_PER_SOL by default
    user_initial_social_score: 10_000, // 10_000 by default - already have room to decrease and die of bankruptcy
};
