use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// BOUNTY ENUMS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum BountyStatus {
    Open,                         // sponsor may award or close
    Awarded { answer: Pubkey },   // frozen, claimable by answer author
    ClosedNoAward,                // sponsor explicitly rejected all answers
    ExpiredUnresolved,            // sponsor did nothing before expiry
}

// -----------------------------------------------------------------------------
// BOUNTY ACCOUNTS
// -----------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct BountyAccount {
    pub question: Pubkey,     // must be PostFunction::Question
    pub sponsor: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub expires_at: i64,      // unix timestamp
    pub status: BountyStatus,
    pub claimed: bool,
    pub bump: u8,
}

impl BountyAccount {
    pub const INIT_SPACE: usize = 8 +                             // discriminator
        32 +                            // question
        32 +                            // sponsor
        32 +                            // token_mint
        8 +                             // amount
        8 +                             // expires_at
        1 + 1 + 32 +                    // status: enum tag + variant tag + answer pubkey if Awarded
        1 +                             // claimed
        1;                              // bump
}

