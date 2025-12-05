use anchor_lang::prelude::*;

declare_id!("7rvaTYkLd65u2NzGyhTsDgQV5NtFQJfEieWvX2dM3Hfm");

#[program]
pub mod klend_tester {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
