use crate::pda_seeds::*;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions;


use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::ErrorCode;


// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Payer for transaction fees and account initialization
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,  
        seeds = [FREEPORT_CONFIG_SEED],
        bump,
        space = 8 + FreeportConfig::INIT_SPACE,
    )]
    pub freeport_config: Account<'info,  FreeportConfig>,
    
    // #[account(
    //     init,
    //     payer = payer,
    //     seeds = [FREEPORT_VALID_COLLECTION_SEED, nft_mint.key().as_ref()],
    //     bump,
    //     space = 8 + ValidCollection::INIT_SPACE, 
    // )]
    // pub valid_collection: Account<'info, ValidCollection>,
    
    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT 
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterValidCollection<'info> {
    #[account(
        seeds = [FREEPORT_CONFIG_SEED],
        bump,
        constraint = freeport_config.admin == admin.key(),
    )]
    pub freeport_config: Account<'info, FreeportConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// Metaplex collection mint
    pub collection_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        seeds = [FREEPORT_VALID_COLLECTION_SEED, collection_mint.key().as_ref()],
        bump,
        space = 8 + ValidCollection::INIT_SPACE,
    )]
    pub valid_collection: Account<'info, ValidCollection>,

    pub system_program: Program<'info, System>,
}




#[derive(Accounts)]
pub struct AttackAppearanceFreshness<'info> {

    /// CHECK: validated by OM
    #[account(mut)]
    pub om_config: UncheckedAccount<'info>,

    /// NFT being used
    pub nft_mint: Account<'info, Mint>,

    /// CHECK: Metaplex metadata
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: extracted from metadata
    pub collection_mint: UncheckedAccount<'info>,

    #[account(
        seeds = [FREEPORT_VALID_COLLECTION_SEED, collection_mint.key().as_ref()],
        bump = valid_collection.bump,
        constraint = valid_collection.enabled,
    )]
    pub valid_collection: Account<'info, ValidCollection>,

    /// CHECK: target user
    #[account(mut)]
    pub target_user: UncheckedAccount<'info>,

    pub opinions_market_program: Program<'info, opinions_market::program::OpinionsMarket>,
    pub system_program: Program<'info, System>,
}


/// User deposits from their wallet into the program-controlled vault.
/// Also initializes the program-controlled vault if it doesn't exist.
#[derive(Accounts)]
pub struct Deposit<'info> {
    // Here the user must be a signer. If we want to use someone else to pay other than our centralized payer, just pass user into payer.
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Payer for transaction fees (can be user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: persona-owned user account
      /// Persona-owned user account (OPAQUE)
    /// We only check ownership + PDA derivation
    #[account(owner = persona::ID)]
    pub user_account: AccountInfo<'info>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        seeds = [FREEPORT_VALID_COLLECTION_SEED, nft_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidCollection>,

    #[account(mut)]
    pub user_token_ata: Account<'info, TokenAccount>,

    /// CHECK: Vault authority PDA derived from seeds
    #[account(
        seeds = [FREEPORT_VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [FREEPORT_USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = vault_authority,
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    // Here the user must be a signer. If we want to use someone else to pay other than our centralized payer, just pass user into payer.
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Payer for transaction fees (can be user or backend)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: persona-owned user account
      /// Persona-owned user account (OPAQUE)
    /// We only check ownership + PDA derivation
    #[account(
        owner = persona::ID,
    )]
    pub user_account: AccountInfo<'info>,
    pub nft_mint: Account<'info, Mint>,

    // user’s personal wallet ATA for this mint
    #[account(mut)]
    pub user_token_dest_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [FREEPORT_USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        constraint = user_vault_token_account.owner == vault_authority.key(),
        constraint = user_vault_token_account.mint == nft_mint.key(),
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA derived from seeds
    #[account(
        seeds = [FREEPORT_VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct SendToken<'info> {
    /// CHECK: Sender (can be session key or wallet)
    #[account(mut)]
    pub sender: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees and account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Recipient of the tokens
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    /// CHECK: persona-owned session authority (opaque)
    #[account(owner = persona::ID)]
    pub session_authority: AccountInfo<'info>,

    /// CHECK: persona-owned user account (opaque)
    #[account(owner = persona::ID)]
    pub sender_user_account: AccountInfo<'info>,

    
    pub nft_mint: Account<'info, Mint>,

    #[account(
        seeds = [FREEPORT_VALID_COLLECTION_SEED, nft_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidCollection>,

    #[account(
        mut,
        seeds = [FREEPORT_USER_VAULT_TOKEN_ACCOUNT_SEED, sender.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = vault_authority,
    )]
    pub sender_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [FREEPORT_VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [FREEPORT_USER_VAULT_TOKEN_ACCOUNT_SEED, recipient.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = vault_authority,
    )]
    pub recipient_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Persona program for CPI calls
    pub persona_program: Program<'info, persona::program::Persona>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

