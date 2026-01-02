use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct TipVault {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub unclaimed_amount: u64,
    pub bump: u8,
}

impl TipVault {
    pub fn new(owner: Pubkey, token_mint: Pubkey, bump: u8) -> Self {
        Self {
            owner,
            token_mint,
            unclaimed_amount: 0,
            bump,
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct EmissionsVault {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub unclaimed_amount: u64,
    pub bump: u8,
}

impl EmissionsVault {
    pub fn new(owner: Pubkey, token_mint: Pubkey, bump: u8) -> Self {
        Self {
            owner,
            token_mint,
            unclaimed_amount: 0,
            bump,
        }
    }
}
