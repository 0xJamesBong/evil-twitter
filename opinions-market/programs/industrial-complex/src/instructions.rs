use crate::{
    pda_seeds::*,
    states::{IcConfig, ItemDefinition},
    ErrorCode,
};
use anchor_lang::prelude::*;

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(init, payer = payer, seeds = [IC_CONFIG_SEED], bump, space = 8 + ICConfig::INIT_SPACE)]
    pub ic_config: Account<'info, ICConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AttackAppearanceFreshness<'info> {
    pub opinions_market_program: Program<'info, opinions_market::program::OpinionsMarket>,

    /// CHECK: validated by opinions-market during CPI
    #[account(mut)]
    pub om_config: UncheckedAccount<'info>,

    /// seeds enforced here so the PDA cannot be swapped
    /// CHECK: IC PDA that represents issuing authority
    #[account(
        seeds = [ISSUE_AUTHORITY_SEED],
        bump
    )]
    pub issue_authority: UncheckedAccount<'info>,

    /// CHECK: real user identity (owner of UserAccount and vaults)
    #[account(mut)]
    pub target_user: UncheckedAccount<'info>,

    /// CHECK: Target voter account (validated by opinions-market during CPI)
    #[account(mut)]
    pub target_user_voter_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateItemDefinition<'info> {
    #[account(mut,
    constraint = ic_config.admin == admin.key() @ ErrorCode::NotIcAdmin)]
    pub ic_config: Account<'info, IcConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK
    pub collection: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ItemDefinition::INIT_SPACE,
    )]
    pub item_definition: Account<'info, ItemDefinition>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintItem<'info> {
    #[account(mut)]
    pub item_definition: Account<'info, ItemDefinition>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    pub mint_authority: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositItem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
