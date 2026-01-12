use crate::{
    pda_seeds::*,
    states::{config::IcConfig, ItemDefinition},
    ErrorCode,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use mpl_token_metadata::ID as TOKEN_METADATA_ID;

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(init, payer = payer, seeds = [IC_CONFIG_SEED], bump, space = 8 + IcConfig::INIT_SPACE)]
    pub ic_config: Account<'info, IcConfig>,

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
        seeds = [IC_ISSUE_AUTHORITY_SEED],
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

/// CreateItemDefinition - Creates both the collection NFT and the item definition atomically.
/// The collection is part of the item type identity and must be created together with the item definition.
#[derive(Accounts)]
pub struct CreateItemDefinition<'info> {
    #[account(mut,
    constraint = ic_config.admin == admin.key() @ ErrorCode::NotIcAdmin)]
    pub ic_config: Account<'info, IcConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ItemDefinition::INIT_SPACE,
    )]
    pub item_definition: Box<Account<'info, ItemDefinition>>,

    /// Collection mint - created as part of this instruction
    #[account(mut)]
    pub collection_mint: Account<'info, Mint>,

    /// CHECK: PDA metadata account for collection NFT
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: PDA ["metadata", TOKEN_METADATA_ID, collection_mint, "edition"]
    #[account(mut)]
    pub collection_master_edition: UncheckedAccount<'info>,

    /// CHECK: Token Metadata program
    #[account(address = TOKEN_METADATA_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    /// CHECK: sysvar instructions account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: UncheckedAccount<'info>,

    // rent is necessary for the collection mint account
    pub rent: Sysvar<'info, Rent>,
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
