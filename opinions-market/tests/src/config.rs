use solana_sdk::native_token::LAMPORTS_PER_SOL;

pub struct TimeConfig {
    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,
}

pub const TIME_CONFIG_FAST: TimeConfig = TimeConfig {
    base_duration_secs: 10,     // 10 seconds
    max_duration_secs: 60,      // 1 min
    extension_per_vote_secs: 5, // 5 seconds
};

pub const TIME_CONFIG_NORMAL: TimeConfig = TimeConfig {
    base_duration_secs: 24 * 3600,    // 1 day
    max_duration_secs: 7 * 24 * 3600, // 7 days
    extension_per_vote_secs: 60,      // 1 min
};

pub struct Rates {
    pub sol_to_bling: u64,
    pub usdc_to_bling: u64,
}

pub const RATES: Rates = Rates {
    sol_to_bling: 1_000_000_000,
    usdc_to_bling: 10_000,
};
