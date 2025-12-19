use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

declare_id!("44Ti52xtPRNGHBrWWpWFFWHzngCQChCzoEPeLWxeRFxC");

#[derive(Accounts)]
pub struct Ping {}

#[program]
pub mod referrals {

    use super::*;
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        msg!("Greetings from referrals: {:?}", ctx.program_id);
        panic!("SHIT");
        Ok(())
    }
}
