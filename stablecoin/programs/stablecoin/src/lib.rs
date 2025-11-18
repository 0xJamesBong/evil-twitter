use anchor_lang::prelude::*;

declare_id!("88PtLphWetTTc5jQqCs2Ao6N12pGWG1sRqEyMjmg2c3e");

#[program]
pub mod stablecoin {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
