use crate::pda_seeds::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::ErrorCode;

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,  
        seeds = [CONFIG_SEED],
        bump,
        space = 8 + Config::INIT_SPACE,
    )]
    pub config: Account<'info, Config>,
    pub bling_mint: Account<'info, Mint>,
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = payer,
        seeds = [PROTOCOL_TREASURY_SEED, bling_mint.key().as_ref()],bump,
        token::mint = bling_mint,
        token::authority = config,
    )]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,

    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT 
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterAlternativePayment<'info> {
    #[account(mut,
    constraint = config.admin == admin.key())]
    pub config: Account<'info, Config>,
    // we need to require this to be the admin of the config account
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [ACCEPTED_MINT_SEED, token_mint.key().as_ref()],
        bump,
        space = 8 + AlternativePayment::INIT_SPACE,
        constraint = token_mint.key() != config.bling_mint @ ErrorCode::BlingCannotBeAlternativePayment,
    )]
    pub alternative_payment: Account<'info, AlternativePayment>,

    /// NEW treasury token account for this mint, canonical PDA.
    #[account(
        init,
        payer = admin,
        seeds = [PROTOCOL_TREASURY_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config, // <-- SPL owner = config PDA
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ModifyAcceptedMint<'info> {
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump,
        constraint = config.admin == admin.key(),
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [ACCEPTED_MINT_SEED, mint.key().as_ref()],
        bump = accepted_mint.bump,
    )]
    pub accepted_mint: Account<'info, AlternativePayment>,
}

// This initializes the UserAccount PDA only
#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [USER_ACCOUNT_SEED, authority.key().as_ref()],
        bump,
        space = 8 + 64,
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
}

/// User deposits from their wallet into the program-controlled vault.
/// Also initializes the program-controlled vault if it doesn't exist.
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // tie the user account to the authority wallet
    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub config: Account<'info, Config>,

    // the token being deposited (BLING, USDC, etc.)
    pub token_mint: Account<'info, Mint>,

    // For BLING deposits, this can be a dummy account. For alternative payments, this must exist and be enabled.
    /// CHECK: Only validated for non-BLING mints. For BLING, pass a dummy account.
    pub accepted_alternative_payment: Option<UncheckedAccount<'info>>,

    // user's personal wallet ATA for this mint
    #[account(mut)]
    pub user_token_ata: Account<'info, TokenAccount>,

    /// Global vault authority PDA (no data)
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    // Program-controlled vault (PDA) for (user, mint).
    // This is where you can use init_if_needed instead of a separate instruction.
    #[account(
        init_if_needed,
        payer = user,
        seeds = [VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    // user’s personal wallet ATA for this mint
    #[account(mut)]
    pub user_token_dest_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = vault_token_account.owner == vault_authority.key(),
        constraint = vault_token_account.mint == token_mint.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Global vault authority PDA
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(post_id_hash: [u8; 32])]
pub struct CreatePost<'info> {
    pub config: Account<'info, Config>,
    pub creator_user_account: Account<'info, UserAccount>,
    #[account(
        init,
        payer = payer,
        seeds = [b"post", creator_user_account.key().as_ref(), post_id_hash.as_ref()],
        bump,
        space = 8 + 256,
    )]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(side: Side, units: u32, payment_in_bling: bool)]
pub struct VoteOnPost<'info> {
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    pub user_account: Account<'info, UserAccount>,

    // Per-post per-user position
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POSITION_SEED, post.key().as_ref(), user_account.key().as_ref()],
        bump,
        space = 8 + 128,
    )]
    pub position: Account<'info, UserPostPosition>,

    // Payment vault
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    // BLING & fees
    #[account(mut)]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_bling_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,

    // If paying with non-BLING mint
    pub accepted_alternative_payment: Option<Account<'info, AlternativePayment>>,
    #[account(mut)]
    pub mint_treasury_token_account: Option<Account<'info, TokenAccount>>,
    pub bling_mint: Option<Account<'info, Mint>>,
    /// CHECK
    pub bling_mint_authority: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    pub payer: Signer<'info>, // your relayer/backend
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub creator_bling_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimPostReward<'info> {
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub position: Account<'info, UserPostPosition>,
    #[account(mut)]
    pub post_pot_bling: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub user_bling_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------
// ErrorCode moved to lib.rs at crate root
