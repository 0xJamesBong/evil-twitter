use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

declare_id!("3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d");

#[derive(Accounts)]
pub struct Ping {}

#[program]
pub mod referrals {

    use super::*;
    // Don't import from instructions module - use re-exports from crate root
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        msg!("Greetings from referrals: {:?}", ctx.program_id);
        panic!("SHIT");
        Ok(())
    }
}
