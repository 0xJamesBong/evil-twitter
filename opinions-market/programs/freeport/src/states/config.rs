use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONFIG & UTILITY ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct FreeportConfig {
    pub admin: Pubkey,
    pub payer_authroity: Pubkey,
    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl FreeportConfig {
    pub fn new(admin: Pubkey, payer_authroity: Pubkey, bump: u8, padding: [u8; 7]) -> Self {
        Self {
            admin,
            payer_authroity,

            bump,
            padding,
        }
    }
}
// READY
#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct ValidCollection {
    pub nft_mint: Pubkey,
    /// what's the basic price of the collection in dollars?
    pub base_price_in_dollar: u64,
    // enabled = active and useable in the ecosystem
    pub enabled: bool,
    // allow_deposit = allow users to deposit tokens of the collection (makes most sense for exogeneous collections, pfps)
    pub allow_deposit: bool,
    // allow_withdraw = allow users to withdraw tokens of the collection (say they want to withdraw and sell it elsewhere, or lend it))
    pub allow_withdraw: bool,
    pub bump: u8,
}

impl ValidCollection {
    pub fn new(
        nft_mint: Pubkey,
        base_price_in_dollar: u64,
        enabled: bool,
        allow_deposit: bool,
        allow_withdraw: bool,
    ) -> Self {
        Self {
            nft_mint,
            base_price_in_dollar,
            enabled,
            allow_deposit,
            allow_withdraw,
            bump: 0,
        }
    }
}

/// Used to prevent MEV-like mischief, where a user uses their NFT but also includes a withdraw() instruction in the same transaction

#[account]
pub struct Lock {
    pub nft_mint: Pubkey,
    pub locker: Pubkey,
    pub locked: bool,
    pub bump: u8,
}

impl Lock {
    pub fn new(nft_mint: Pubkey, locker: Pubkey, locked: bool) -> Self {
        Self {
            nft_mint,
            locker,
            locked,
            bump: 0,
        }
    }
}
