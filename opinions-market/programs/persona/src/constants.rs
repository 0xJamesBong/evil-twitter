use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

// These will never be changed

pub const PRECISION: u64 = 1_000_000; // 1e6 fixed-point scale

pub const USDC_LAMPORTS_PER_USDC: u64 = 1_000_000;

// pub struct PayoutParams {

pub struct UserParams {
    pub user_initial_social_score: i64,
}
pub const PARAMS: UserParams = UserParams {
    user_initial_social_score: 10_000, // 10_000 by default - already have room to decrease and die of bankruptcy
};
