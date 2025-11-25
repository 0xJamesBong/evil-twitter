pub struct DeploymentConfig {
    pub protocol_vote_fee_bps: u16,
    pub protocol_vote_settlement_fee_bps: u16,

    pub creator_pump_vote_fee_bps: u16,
    pub creator_vote_settlement_fee_bps: u16,

    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,

    pub vote_per_bling_base_cost: u64, /// 1 vote = 1 * LAMPORTS_PER_SOL by default
    pub user_initial_social_score: i64, /// 10_000 by default
    
}

impl DeploymentConfig {
    pub fn default() -> Self {
        Self {
            protocol_vote_fee_bps: 100, // 1% of every vote goes to the protocol
            protocol_vote_settlement_fee_bps: 100,  // 1% of every vote goes to the protocol
            creator_pump_vote_fee_bps: 100, // 1% of every pump vote goes to the creator 
            creator_vote_settlement_fee_bps: 40, // 40% of the pot goes to the creator when the post is settled
            
            base_duration_secs: 24 * 3600,
            max_duration_secs: 48 * 3600,
            extension_per_vote_secs: 60,
            vote_per_bling_base_cost: 1 * LAMPORTS_PER_SOL, // 1 vote = 1 * LAMPORTS_PER_SOL by default 
            user_initial_social_score: 10_000, // 10_000 by default - already have room to decrease and die of bankruptcy
        }
    }
}