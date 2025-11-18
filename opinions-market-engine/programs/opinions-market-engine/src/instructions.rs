use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Initialize {}

// -----------------------------------------------------------------------------
// CONTEXTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        seeds = [b"config"],
        bump,
        space = 8 + 128,
    )]
    pub config: Account<'info, Config>,
    pub bling_mint: Account<'info, Mint>,
    #[account(mut)]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAcceptedMint<'info> {
    #[account(mut,
    constraint = config.admin == admin.key())]
    pub config: Account<'info, Config>,
    // we need to require this to be the admin of the config account
    #[account(mut)]
    pub admin: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [b"accepted_mint", mint.key().as_ref()],
        bump,
        space = 8 + 96,
    )]
    pub accepted_mint: Account<'info, AcceptedMint>,
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [b"user", authority.key().as_ref()],
        bump,
        space = 8 + 64,
    )]
    pub user_account: Account<'info, UserAccount>,
    pub system_program: Program<'info, System>,
}

/// Create the program-owned vault (ATA) for a given user+mint.
/// authority of the ATA = vault_authority PDA.
#[derive(Accounts)]
pub struct InitUserVault<'info> {
    pub user_account: Account<'info, UserAccount>,
    pub mint: Account<'info, Mint>,
    /// CHECK: PDA just used as token authority
    #[account(
        seeds = [b"vault_authority"],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = vault_authority,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user_source: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user_destination: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == vault_authority.key(),
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [b"vault_authority"],
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
        seeds = [b"position", post.key().as_ref(), user_account.key().as_ref()],
        bump,
        space = 8 + 128,
    )]
    pub position: Account<'info, UserPostPosition>,

    // Payment vault
    #[account(mut)]
    pub user_vault_token_account: Account<'info, TokenAccount>,
    /// CHECK
    #[account(
        seeds = [b"vault_authority"],
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
    pub accepted_mint: Option<Account<'info, AcceptedMint>>,
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
        seeds = [b"post_pot_authority", post.key().as_ref()],
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
        seeds = [b"post_pot_authority", post.key().as_ref()],
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
