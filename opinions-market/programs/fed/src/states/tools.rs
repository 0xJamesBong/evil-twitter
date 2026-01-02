use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONFIG & UTILITY ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct FedConfig {
    pub admin: Pubkey,
    pub payer_authroity: Pubkey,
    pub bling_mint: Pubkey,

    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl FedConfig {
    pub fn new(
        admin: Pubkey,
        payer_authroity: Pubkey,
        bling_mint: Pubkey,
        bump: u8,
        padding: [u8; 7],
    ) -> Self {
        Self {
            admin,
            payer_authroity,
            bling_mint,
            bump,
            padding,
        }
    }
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
