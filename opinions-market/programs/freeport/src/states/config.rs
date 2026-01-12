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
        base_price_in_dollar: u64,
        enabled: bool,
        allow_deposit: bool,
        allow_withdraw: bool,
    ) -> Self {
        Self {
            base_price_in_dollar,
            enabled,
            allow_deposit,
            allow_withdraw,
            bump: 0,
        }
    }
}

/// Used to custody NFTs in freeport
/// Used to prevent MEV-like mischief, where a user uses their NFT but also includes a withdraw() instruction in the same transaction
#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct Lock {
    /// Logical owner inside freeport (persona user) - required
    pub owner: Pubkey,

    /// The NFT mint held in custody
    pub nft_mint: Pubkey,

    /// Cached for fast checks (validated on deposit)
    pub collection_mint: Pubkey,

    /// Whether the NFT is currently committed to an effect
    pub locked: bool,

    pub bump: u8,
}

impl Lock {
    pub fn new(owner: Pubkey, nft_mint: Pubkey, collection_mint: Pubkey) -> Self {
        Self {
            owner,
            nft_mint,
            collection_mint,
            locked: false,
            bump: 0,
        }
    }
}
