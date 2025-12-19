use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONFIG & UTILITY ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct Config {
    pub admin: Pubkey,
    pub payer_authroity: Pubkey,
    pub bling_mint: Pubkey,

    pub base_duration_secs: u32,
    pub max_duration_secs: u32,
    pub extension_per_vote_secs: u32,

    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl Config {
    pub fn new(
        admin: Pubkey,
        payer_authroity: Pubkey,
        bling_mint: Pubkey,
        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
        bump: u8,
        padding: [u8; 7],
    ) -> Self {
        Self {
            admin,
            payer_authroity,
            bling_mint,
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            bump,
            padding,
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct SessionAuthority {
    pub user: Pubkey,              // wallet being delegated
    pub session_key: Pubkey,       // ephemeral pubkey authorized to act
    pub expires_at: i64,           // timestamp
    pub privileges_hash: [u8; 32], // optional whitelist hash
    pub bump: u8,
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct ValidPayment {
    pub token_mint: Pubkey,
    /// how much is 1 token in BLING votes -
    /// 1 USDC = 10_000 BLING for example
    /// 1 SOL = 1_000_000_000 BLING for example
    /// This value is lamport-free. So 1 BLING = 1 BLING
    pub price_in_bling: u64,
    pub enabled: bool,
    pub withdrawable: bool,
    pub bump: u8,
}

impl ValidPayment {
    pub fn new(token_mint: Pubkey, price_in_bling: u64, enabled: bool, withdrawable: bool) -> Self {
        Self {
            token_mint,
            price_in_bling,
            enabled,
            withdrawable,
            bump: 0,
        }
    }
}
