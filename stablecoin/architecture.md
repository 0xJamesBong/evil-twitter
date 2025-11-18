use anchor_lang::prelude::\*;
use anchor_spl::token::{
self, Mint, Token, TokenAccount, Transfer, MintTo,
};

declare_id!("88PtLphWetTTc5jQqCs2Ao6N12pGWG1sRqEyMjmg2c3e");

#[program]
pub mod stablecoin {
use super::\*;

    pub fn initialize(
        ctx: Context<Initialize>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.stable_mint = ctx.accounts.stable_mint.key();
        config.collateral_mint = ctx.accounts.collateral_mint.key();
        config.treasury_vault = ctx.accounts.treasury_vault.key();
        config.bump = *ctx.bumps.get("config").unwrap();

        Ok(())
    }

    /// Anyone can call this: deposit USDC, receive stable.
    /// No redemption path is exposed.
    pub fn issue(ctx: Context<Issue>, amount: u64) -> Result<()> {
        // 1) Take collateral from user → treasury vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_collateral.to_account_info(),
            to: ctx.accounts.treasury_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // 2) (Optional) here you'd call Kamino via CPI to deposit the USDC from treasury_vault.
        // cpi_to_kamino_deposit(...);

        // 3) Mint stablecoin to user, using config PDA as mint authority
        let config = &ctx.accounts.config;
        let seeds: &[&[u8]] = &[
            b"config",
            &[config.bump],
        ];
        let signer_seeds = &[seeds];

        let cpi_accounts_mint = MintTo {
            mint: ctx.accounts.stable_mint.to_account_info(),
            to: ctx.accounts.user_stable.to_account_info(),
            authority: config.to_account_info(),
        };
        let cpi_ctx_mint = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_mint,
            signer_seeds,
        );
        token::mint_to(cpi_ctx_mint, amount)?;

        Ok(())
    }

    /// Privileged minting: no collateral deposit required.
    /// Only `config.authority` can call this.
    pub fn privileged_mint(ctx: Context<PrivilegedMint>, amount: u64) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.config.authority,
            StableError::Unauthorized
        );

        let config = &ctx.accounts.config;
        let seeds: &[&[u8]] = &[
            b"config",
            &[config.bump],
        ];
        let signer_seeds = &[seeds];

        let cpi_accounts_mint = MintTo {
            mint: ctx.accounts.stable_mint.to_account_info(),
            to: ctx.accounts.recipient_stable.to_account_info(),
            authority: config.to_account_info(),
        };
        let cpi_ctx_mint = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_mint,
            signer_seeds,
        );
        token::mint_to(cpi_ctx_mint, amount)?;

        Ok(())
    }

    // If you *ever* want OTC redemption, you'd add something like:
    // pub fn privileged_redeem(ctx: Context<PrivilegedRedeem>, amount: u64) -> Result<()> { ... }
    // and check a separate `redeemer_role` instead of config.authority.

}

#[derive(Accounts)]
pub struct Initialize<'info> {
/// Payer and initial authority (can be a multisig / DAO later) #[account(mut)]
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
pub struct Issue<'info> { #[account(mut)]
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

#[error_code]
pub enum StableError { #[msg("Unauthorized")]
Unauthorized,
}
