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

// #[derive(Accounts)]
// pub struct DepositItem<'info> {
//     #[account(mut)]
//     pub user: Signer<'info>,

//     #[account(mut)]
//     pub user_token_account: Account<'info, TokenAccount>,

//     #[account(mut)]
//     pub vault_token_account: Account<'info, TokenAccount>,

//     pub token_program: Program<'info, Token>,
// }

// // InitializeCollection removed - collection creation is now part of create_item_definition
// // to ensure atomic creation and proper lifecycle management.

// #[derive(Accounts)]
// pub struct BuyItem<'info> {
//     #[account(mut)]
//     pub ic_config: Box<Account<'info, IcConfig>>,

//     #[account(mut)]
//     pub item_definition: Box<Account<'info, ItemDefinition>>,

//     /// CHECK: Collection mint (validated against item_definition.collection)
//     #[account(mut)]
//     pub collection_mint: Account<'info, Mint>,

//     /// CHECK: PDA metadata account for collection NFT
//     #[account(mut)]
//     pub collection_metadata: UncheckedAccount<'info>,

//     /// CHECK: PDA ["metadata", TOKEN_METADATA_ID, collection_mint, "edition"]
//     #[account(mut)]
//     pub collection_master_edition: UncheckedAccount<'info>,

//     #[account(mut)]
//     pub user: Signer<'info>,

//     /// New NFT mint - created on purchase
//     #[account(
//         init,
//         payer = payer,
//         mint::decimals = 0,
//         mint::authority = ic_vault_authority,
//         mint::freeze_authority = ic_vault_authority
//     )]
//     pub mint: Account<'info, Mint>,

//     /// CHECK: derived off-chain
//     #[account(mut)]
//     pub metadata: UncheckedAccount<'info>,

//     /// CHECK: derived off-chain
//     #[account(mut)]
//     pub master_edition: UncheckedAccount<'info>,

//     /// CHECK: User NFT vault token account (IC-owned)
//     /// Token account owner: IC vault authority PDA
//     /// Account owner (program owner): SPL Token program
//     #[account(
//         init_if_needed,
//         payer = payer,
//         seeds = [IC_USER_NFT_VAULT_SEED, user.key().as_ref(), mint.key().as_ref()],
//         bump,
//         token::mint = mint,
//         token::authority = ic_vault_authority,
//     )]
//     pub user_nft_vault_token_account: Account<'info, TokenAccount>,

//     /// CHECK: IC vault authority PDA (single-purpose, deterministic)
//     #[account(
//         seeds = [IC_TOKEN_VAULT_AUTHORITY_SEED],
//         bump
//     )]
//     pub ic_vault_authority: UncheckedAccount<'info>,

//     /// CHECK: Token Metadata program
//     #[account(address = TOKEN_METADATA_ID)]
//     pub token_metadata_program: UncheckedAccount<'info>,

//     pub token_program: Program<'info, Token>,
//     pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
//     pub system_program: Program<'info, System>,

//     /// CHECK: sysvar instructions account
//     #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
//     pub sysvar_instructions: UncheckedAccount<'info>,

//     pub rent: Sysvar<'info, Rent>,

//     // Fed accounts for payment
//     /// CHECK: Fed program
//     pub fed_program: Program<'info, fed::program::Fed>,

//     /// CHECK: User pubkey for Fed vault
//     #[account(mut)]
//     pub fed_user: UncheckedAccount<'info>,

//     /// CHECK: User vault token account (Fed-owned, source of charge)
//     #[account(
//         mut,
//         seeds = [
//             fed::pda_seeds::FED_USER_VAULT_TOKEN_ACCOUNT_SEED,
//             fed_user.key().as_ref(),
//             token_mint.key().as_ref()
//         ],
//         bump,
//         token::mint = token_mint,
//         token::authority = fed_vault_authority,
//     )]
//     pub from_user_vault_token_account: Account<'info, TokenAccount>,

//     /// CHECK: Protocol treasury token account (Fed-owned, destination for charged tokens)
//     #[account(
//         mut,
//         seeds = [
//             fed::pda_seeds::FED_PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED,
//             token_mint.key().as_ref()
//         ],
//         bump,
//         token::mint = token_mint,
//         token::authority = fed_config,
//     )]
//     pub protocol_treasury_token_account: Account<'info, TokenAccount>,

//     #[account(
//         seeds = [fed::pda_seeds::FED_VALID_PAYMENT_SEED, token_mint.key().as_ref()],
//         bump = valid_payment.bump,
//         constraint = valid_payment.enabled @ ErrorCode::InsufficientFunds,
//     )]
//     pub valid_payment: Box<Account<'info, fed::states::ValidPayment>>,

//     pub token_mint: Account<'info, Mint>,

//     /// CHECK: Config PDA (authority of treasury token account)
//     #[account(
//         seeds = [fed::pda_seeds::FED_CONFIG_SEED],
//         bump,
//     )]
//     pub fed_config: Account<'info, fed::states::FedConfig>,

//     /// CHECK: Vault authority PDA (Fed-owned, signs the transfer)
//     #[account(
//         seeds = [fed::pda_seeds::FED_VAULT_AUTHORITY_SEED],
//         bump,
//     )]
//     pub fed_vault_authority: UncheckedAccount<'info>,

//     #[account(mut)]
//     pub payer: Signer<'info>,
// }

// #[derive(Accounts)]
// pub struct WithdrawItem<'info> {
//     #[account(mut)]
//     pub user: Signer<'info>,

//     /// CHECK: IC vault authority PDA (single-purpose, deterministic)
//     #[account(
//         seeds = [IC_TOKEN_VAULT_AUTHORITY_SEED],
//         bump
//     )]
//     pub ic_vault_authority: UncheckedAccount<'info>,

//     /// CHECK: User NFT vault token account (IC-owned, source)
//     #[account(
//         mut,
//         seeds = [IC_USER_NFT_VAULT_SEED, user.key().as_ref(), mint.key().as_ref()],
//         bump,
//         token::mint = mint,
//         token::authority = ic_vault_authority,
//     )]
//     pub user_nft_vault_token_account: Account<'info, TokenAccount>,

//     /// User's ATA (destination)
//     #[account(
//         init_if_needed,
//         payer = user,
//         associated_token::mint = mint,
//         associated_token::authority = user,
//     )]
//     pub user_token_account: Account<'info, TokenAccount>,

//     pub mint: Account<'info, Mint>,

//     pub token_program: Program<'info, Token>,
//     pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
//     pub system_program: Program<'info, System>,
// }
