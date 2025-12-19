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
        seeds = [VALID_PAYMENT_SEED, bling_mint.key().as_ref()],
        bump,
        space = 8 + ValidPayment::INIT_SPACE, 
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(
        init,
        payer = payer,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, bling_mint.key().as_ref()],bump,
        token::mint = bling_mint,
        token::authority = config,
    )]
    pub protocol_bling_treasury: Account<'info, TokenAccount>,

    // DO NOT ADD USDC HERE, TREAT IT AS AN ALTERNATIVE PAYMENT MINT 
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterValidPayment<'info> {
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
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump,
        space = 8 + ValidPayment::INIT_SPACE,
        constraint = token_mint.key() != config.bling_mint @ ErrorCode::BlingCannotBeAlternativePayment,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    /// NEW treasury token account for this mint, canonical PDA.
    #[account(
        init,
        payer = admin,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config, // <-- SPL owner = config PDA
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

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
        seeds = [VALID_PAYMENT_SEED, mint.key().as_ref()],
        bump = accepted_mint.bump,
    )]
    pub accepted_mint: Account<'info, ValidPayment>,
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

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(mut)]
    pub user_token_ata: Account<'info, TokenAccount>,

    /// CHECK: Vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
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
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = user_vault_token_account.owner == vault_authority.key(),
        constraint = user_vault_token_account.mint == token_mint.key(),
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Tip<'info> {
    /// CHECK: Sender (can be session key or wallet)
    #[account(mut)]
    pub sender: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees and account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Recipient of the tip (validated in instruction logic)
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: ephemeral delegated session key (can be same as sender for wallet signing)
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sender_user_account.user.as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, sender.key().as_ref()],
        bump,
    )]
    pub sender_user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sender.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub sender_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [TIP_VAULT_SEED, recipient.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + TipVault::INIT_SPACE,
    )]
    pub tip_vault: Account<'info, TipVault>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [TIP_VAULT_TOKEN_ACCOUNT_SEED, recipient.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub tip_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimTips<'info> {
    /// CHECK: Owner of the tip vault (can be session key or wallet)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    /// CHECK: Payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: ephemeral delegated session key
    #[account(mut)]
    pub session_key: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, owner.key().as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [TIP_VAULT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub tip_vault: Account<'info, TipVault>,

    #[account(
        mut,
        seeds = [TIP_VAULT_TOKEN_ACCOUNT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub tip_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub owner_user_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
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

    #[account(
        mut,
        seeds = [SESSION_AUTHORITY_SEED, sender_user_account.user.as_ref(), session_key.key().as_ref()],
        bump,
    )]
    pub session_authority: Account<'info, SessionAuthority>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, sender.key().as_ref()],
        bump,
    )]
    pub sender_user_account: Account<'info, UserAccount>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, sender.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub sender_user_vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Global vault authority PDA
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, recipient.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub recipient_user_vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
