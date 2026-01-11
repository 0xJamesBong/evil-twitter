use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONFIG & UTILITY ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct OMConfig {
    pub admin: Pubkey,

    pub authorized_issuer: Pubkey,
    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,

    pub resurrection_fee: u64,
    pub resurrection_fee_bling_premium: u64,
    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl OMConfig {
    pub fn new(
        admin: Pubkey,
        authorized_issuer: Pubkey,
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
        resurrection_fee: u64,
        resurrection_fee_bling_premium: u64,
        bump: u8,
        padding: [u8; 7],
    ) -> Self {
        Self {
            admin,
            authorized_issuer,
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            resurrection_fee,
            resurrection_fee_bling_premium,
            bump,
            padding,
        }
    }

    pub fn is_authorized_issuer(&self, issuer: Pubkey) -> bool {
        self.authorized_issuer == issuer
    }

    pub fn update_config(
        &mut self,
        admin: Pubkey,
        authorized_issuer: Pubkey,
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
        resurrection_fee: u64,
        resurrection_fee_bling_premium: u64,
    ) -> Self {
        Self {
            admin,
            authorized_issuer,
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            resurrection_fee,
            resurrection_fee_bling_premium,
            bump: self.bump,
            padding: self.padding,
        }
    }
}
