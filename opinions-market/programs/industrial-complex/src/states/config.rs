use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Copy, PartialEq, Eq, Debug)]
pub struct IcConfig {
    pub admin: Pubkey,
    pub bump: u8,
    pub padding: [u8; 7], // 7
}

impl IcConfig {
    pub fn new(admin: Pubkey, bump: u8, padding: [u8; 7]) -> Self {
        Self {
            admin,

            bump,
            padding,
        }
    }
}
