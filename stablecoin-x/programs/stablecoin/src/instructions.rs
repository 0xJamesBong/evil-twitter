use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Payer and initial authority (can be a multisig / DAO later)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Program config PDA – also used as mint authority
    #[account(
        init,
        payer = authority,
        seeds = [b"config"],
        bump,
        space = 8 + Config::LEN,
    )]
    pub config: Account<'info, Config>,

    /// Your stablecoin mint; mint authority = config PDA
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = config,
        mint::freeze_authority = config,
    )]
    pub stable_mint: Account<'info, Mint>,

    /// Collateral mint (e.g. USDC) – assumed pre-existing
    pub collateral_mint: Account<'info, Mint>,

    /// Treasury vault: holds collateral + Kamino withdrawals
    #[account(
        init,
        payer = authority,
        seeds = [b"treasury_vault"],
        bump,
        token::mint = collateral_mint,
        token::authority = config,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Issue<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// User's USDC account
    #[account(
        mut,
        constraint = user_collateral.mint == config.collateral_mint,
        constraint = user_collateral.owner == user.key(),
    )]
    pub user_collateral: Account<'info, TokenAccount>,

    /// User's stablecoin account
    #[account(
        mut,
        constraint = user_stable.mint == config.stable_mint,
        constraint = user_stable.owner == user.key(),
    )]
    pub user_stable: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = stable_mint,
        has_one = collateral_mint,
        has_one = treasury_vault,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub stable_mint: Account<'info, Mint>,

    #[account(mut)]
    pub collateral_mint: Account<'info, Mint>,

    /// Program’s USDC treasury vault
    #[account(
        mut,
        address = config.treasury_vault,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    // + Kamino accounts later when you wire CPI
    // pub kamino_program: UncheckedAccount<'info>,
    // pub kamino_vault: UncheckedAccount<'info>,
    // ...
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// User's USDC account
    #[account(
        mut,
        constraint = user_collateral.mint == config.collateral_mint,
        constraint = user_collateral.owner == user.key(),
    )]
    pub user_collateral: Account<'info, TokenAccount>,

    /// User's stablecoin account
    #[account(
        mut,
        constraint = user_stable.mint == config.stable_mint,
        constraint = user_stable.owner == user.key(),
    )]
    pub user_stable: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = stable_mint,
        has_one = collateral_mint,
        has_one = treasury_vault,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub stable_mint: Account<'info, Mint>,

    #[account(mut)]
    pub collateral_mint: Account<'info, Mint>,

    /// Program’s USDC treasury vault
    #[account(
        mut,
        address = config.treasury_vault,
    )]
    pub treasury_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PrivilegedMint<'info> {
    /// Admin / DAO signer (config.authority)
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = stable_mint,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub stable_mint: Account<'info, Mint>,

    #[account(mut)]
    pub recipient_stable: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub stable_mint: Pubkey,
    pub collateral_mint: Pubkey,
    pub treasury_vault: Pubkey,
    pub bump: u8,
    // later:
    // pub kamino_vault: Pubkey,
    // pub ltv_config: u64,
    // pub emergency_flag: bool,
}

impl Config {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 1;
}
