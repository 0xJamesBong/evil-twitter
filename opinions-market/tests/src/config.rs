use solana_sdk::native_token::LAMPORTS_PER_SOL;

pub struct TestTimeConfigForTime {
    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,
}

impl TestTimeConfigForTime {
    pub fn fast(
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
    ) -> Self {
        Self {
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
        }
    }

    pub fn normal() -> Self {
        Self {
            base_duration_secs: 24 * 3600,    // 1 day
            max_duration_secs: 7 * 24 * 3600, // 7 days
            extension_per_vote_secs: 60,      // 1 min
        }
    }
}
