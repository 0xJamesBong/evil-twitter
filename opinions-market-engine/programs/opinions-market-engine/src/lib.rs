use anchor_lang::prelude::*;

declare_id!("8zZcmGeJ6KXSnSyewB7vfLUrYVLfibh6UP3qPujQoeaa");

#[program]
pub mod opinions_market_engine {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
