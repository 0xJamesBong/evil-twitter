use crate::pda_seeds::*;
use crate::states::*;
use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions;
use anchor_spl::token::{Mint, Token, TokenAccount};

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

    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

// This initializes the UserAccount PDA only
#[derive(Accounts)]
pub struct CreateUser<'info> {
    // This is the only case where the user remains a signer - keeps it real bro.
    /// CHECK: User is marked as an UncheckedAccount to allow for dual signing patterns
    #[account(mut)]
    pub user: UncheckedAccount<'info>,

    // This must be kept because we don't want strangers initializing user accounts for other users.
    /// CHECK: Payer can be either the user or backend payer, allowing for flexible fee payment
    #[account(mut,
    // constraint = payer.key() == config.payer_authroity || payer.key() == user.key()
    )]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
        space = 8 + UserAccount::INIT_SPACE,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(expected_index: u8)]
pub struct RegisterSession<'info> {
    /// CHECK: Payer for transaction fees and session authority account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: the user wallet we are delegating authority for
    pub user: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    pub session_key: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [SESSION_AUTHORITY_SEED, user.key().as_ref(), session_key.key().as_ref()],
        bump,
        space = 8 + SessionAuthority::INIT_SPACE,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    /// CHECK: sysvar required to load instructions in the tx
    #[account(address = instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckSessionOrWallet<'info> {
    /// CHECK: the user wallet we are delegating authority for
    pub user: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key
    pub session_key: UncheckedAccount<'info>,

    /// CHECK: persona-owned session authority (opaque)
    #[account(
        seeds = [SESSION_AUTHORITY_SEED, user.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,
}
