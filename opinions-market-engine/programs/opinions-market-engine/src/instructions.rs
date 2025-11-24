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
        payer = user,
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
#[instruction(post_id_hash: [u8; 32])]
pub struct CreatePost<'info> {
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
        space = 8 + PostAccount::INIT_SPACE,
    )]
    pub post: Account<'info, PostAccount>,
    pub system_program: Program<'info, System>,
}



#[derive(Accounts)]
#[instruction(side: Side, units: u32, post_id_hash: [u8; 32])]
pub struct VoteOnPost<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,


    #[account(
        mut,
        seeds = [POST_ACCOUNT_SEED, post_id_hash.as_ref()],
        bump,
    )]
    pub post: Account<'info, PostAccount>,

    #[account(
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POSITION_SEED, post.key().as_ref(), user.key().as_ref()],
        bump,
        space = 8 + UserPostPosition::INIT_SPACE,
    )]
    pub position: Account<'info, UserPostPosition>,

    /// CHECK: Vault authority PDA derived from seeds
    #[account(
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    // THIS IS NOW LAZY-CREATED
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = post_pot_authority,
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA derived from seeds
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    // protocol treasury pot for this mint
    #[account(
        mut,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    // creator's vault for receiving creator fees
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [USER_VAULT_TOKEN_ACCOUNT_SEED, post.creator_user.as_ref(), token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
    )]
    pub creator_vault_token_account: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [VALID_PAYMENT_SEED, token_mint.key().as_ref()],
        bump = valid_payment.bump,
        constraint = valid_payment.enabled @ ErrorCode::MintNotEnabled,
    )]
    pub valid_payment: Account<'info, ValidPayment>,

    pub token_mint: Account<'info, Mint>,

    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.mint == token_mint.key(),
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA derived from seeds
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    // per-post per-mint “snapshot” payout
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        space = 8 + PostMintPayout::INIT_SPACE
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    #[account(
        mut,
        seeds = [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = config,
    )]
    pub protocol_token_treasury_token_account: Account<'info, TokenAccount>,

    // Optional parent post (if child)
    pub parent_post: Option<Account<'info, PostAccount>>,

    pub config: Account<'info, Config>,
    pub token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct ClaimPostReward<'info> {
    pub post: Account<'info, PostAccount>,
    #[account(mut)]
    pub position: Account<'info, UserPostPosition>,

    #[account(
        seeds = [POST_MINT_PAYOUT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump = post_mint_payout.bump,
    )]
    pub post_mint_payout: Account<'info, PostMintPayout>,

    #[account(
        mut,
        seeds = [POST_POT_TOKEN_ACCOUNT_SEED, post.key().as_ref(), token_mint.key().as_ref()],
        bump,
        constraint = post_pot_token_account.owner == post_pot_authority.key(),
        constraint = post_pot_token_account.mint == token_mint.key(),
    )]
    pub post_pot_token_account: Account<'info, TokenAccount>,

    /// CHECK: Post pot authority PDA derived from seeds
    #[account(
        seeds = [POST_POT_AUTHORITY_SEED, post.key().as_ref()],
        bump,
    )]
    pub post_pot_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub user_vault_token_account: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------
// ErrorCode moved to lib.rs at crate root
