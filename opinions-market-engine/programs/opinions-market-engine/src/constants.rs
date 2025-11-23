use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

pub const POST_INIT_DURATION_SECS: u32 = 24 * 3600; // 1 day
pub const POST_MAX_DURATION_SECS: u32 = 7 * 24 * 3600; // 7 days

pub const VOTE_PER_BLING_BASE_COST: u64 = 1_000_000 * LAMPORTS_PER_SOL; // 1 VOTE = 1_000_000 BLING
