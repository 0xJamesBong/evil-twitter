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
// READY
#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct ValidPayment {
    pub token_mint: Pubkey,
    /// how much is 1 token in dollars, our virtual unit of account.
    /// e.g.
    /// 1 USDC = 1 dollar
    /// 1 SOL = 200 dollars
    /// This value is lamport-free. So 1 usdc = 1 dollar
    pub price_in_dollar: u64,
    pub enabled: bool,
    pub withdrawable: bool,
    pub bump: u8,
}

impl ValidPayment {
    pub fn new(
        token_mint: Pubkey,
        price_in_dollar: u64,
        enabled: bool,
        withdrawable: bool,
    ) -> Self {
        Self {
            token_mint,
            price_in_dollar: price_in_dollar,
            enabled,
            withdrawable,
            bump: 0,
        }
    }
}
