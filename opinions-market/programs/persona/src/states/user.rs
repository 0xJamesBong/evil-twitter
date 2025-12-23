use crate::constants::PARAMS;
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// USER ACCOUNTS
// -----------------------------------------------------------------------------

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Copy, PartialEq, Eq, Debug, Clone)]
pub struct Health {
    pub enabled: bool,
    // future:
    pub surface_1: i16,
    pub surface_2: i16,
    pub surface_3: i16,
    pub surface_4: i16,
    pub surface_5: i16,
    pub surface_6: i16,
    pub surface_7: i16,
    pub surface_8: i16,
    pub surface_9: i16,
    pub padding: [u8; 31],
}

impl Health {
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            surface_1: 10_000,
            surface_2: 10_000,
            surface_3: 10_000,
            surface_4: 10_000,
            surface_5: 10_000,
            surface_6: 10_000,
            surface_7: 10_000,
            surface_8: 10_000,
            surface_9: 10_000,
            padding: [0; 31],
        }
    }
}

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct UserAccount {
    pub user: Pubkey,      // user wallet pubkey
    pub social_score: i64, // can drive withdraw penalty etc.
    pub health: Health,
    pub bump: u8,
}

impl UserAccount {
    pub fn new(user: Pubkey, bump: u8) -> Self {
        Self {
            user,
            social_score: PARAMS.user_initial_social_score,
            health: Health::new(true),
            bump,
        }
    }
}
