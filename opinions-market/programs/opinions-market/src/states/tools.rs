use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONFIG & UTILITY ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct OMConfig {
    pub admin: Pubkey,

    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,

    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl OMConfig {
    pub fn new(
        admin: Pubkey,
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
        bump: u8,
        padding: [u8; 7],
    ) -> Self {
        Self {
            admin,
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            bump,
            padding,
        }
    }
}
