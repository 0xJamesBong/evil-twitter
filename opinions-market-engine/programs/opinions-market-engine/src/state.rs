use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub bling_mint: Pubkey,
    pub protocol_bling_treasury: Pubkey,
    pub protocol_fee_bps: u16,
    pub creator_fee_bps_pump: u16,
    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,
}

#[account]
pub struct AcceptedMint {
    pub mint: Pubkey,
    pub price_in_bling: u64,
    pub treasury_token_account: Pubkey,
    pub enabled: bool,
}

#[account]
pub struct UserAccount {
    pub authority_wallet: Pubkey,
    pub social_score: i64, // can drive withdraw penalty etc.
}

#[account]
pub struct PostAccount {
    pub creator_user: Pubkey,
    pub post_id_hash: [u8; 32],
    pub start_time: i64,
    pub end_time: i64,
    pub state: PostState,
    pub total_pump_bling: u64,
    pub total_smack_bling: u64,
    pub total_pot_bling: u64,
    pub winning_side: Option<Side>,
    pub payout_per_unit: u64, // stored after settle
}

#[account]
pub struct UserPostPosition {
    pub user: Pubkey,
    pub post: Pubkey,
    pub pump_units: u32,
    pub smack_units: u32,
    pub pump_staked_bling: u64,
    pub smack_staked_bling: u64,
    pub claimed: bool,
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Pump,
    Smack,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PostState {
    Open,
    Settled,
}
