use crate::pda_seeds::*;
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(target: Pubkey)]
pub struct AttackAppearanceFreshness<'info> {
    pub opinions_market_program: Program<'info, opinions_market::program::OpinionsMarket>,

    /// CHECK: validated by opinions-market during CPI
    #[account(mut)]
    pub om_config: UncheckedAccount<'info>,

    /// CHECK: IC PDA that represents issuing authority
    /// seeds enforced here so the PDA cannot be swapped
    #[account(
        seeds = [ISSUE_AUTHORITY_SEED],
        bump
    )]
    pub issue_authority: UncheckedAccount<'info>,

    /// CHECK: Target voter account (validated by opinions-market during CPI)
    #[account(mut)]
    pub voter_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
