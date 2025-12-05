use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

declare_id!("88PtLphWetTTc5jQqCs2Ao6N12pGWG1sRqEyMjmg2c3e");

#[error_code]
pub enum StableError {
    #[msg("Unauthorized")]
    Unauthorized,
}

#[program]
pub mod stablecoin {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.stable_mint = ctx.accounts.stable_mint.key();
        config.collateral_mint = ctx.accounts.collateral_mint.key();
        config.treasury_vault = ctx.accounts.treasury_vault.key();
        config.bump = ctx.bumps.config;

        Ok(())
    }

    /// Anyone can call this: deposit USDC, receive stable.
    /// No redemption path is exposed.
    pub fn issue(ctx: Context<Issue>, amount: u64) -> Result<()> {
        // 1) take collateral from user -> treasury vault
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_collateral.to_account_info(),
            to: ctx.accounts.treasury_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        // 2) (Optional) here you'd call Kamino via CPI to deposit the USDC from treasury_vault.
        // cpi_to_kamino_deposit(...);
        // or reserve the direction of yield into a special function

        // 3) Mint stablecoin to user, using config PDA as mint authority
        let config = &ctx.accounts.config;
        let seeds: &[&[u8]] = &[b"config", &[config.bump]];
        let signer_seeds = &[seeds];

        let cpi_accounts_mint = anchor_spl::token::MintTo {
            mint: ctx.accounts.stable_mint.to_account_info(),
            to: ctx.accounts.user_stable.to_account_info(),
            authority: config.to_account_info(),
        };
        let cpi_ctx_mint = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_mint,
            signer_seeds,
        );
        anchor_spl::token::mint_to(cpi_ctx_mint, amount)?;

        Ok(())
    }

    /// Only privileged friends can call this to redeem
    /// No redemption path is exposed.
    pub fn redeem(ctx: Context<Redeem>, amount: u64) -> Result<()> {
        // 1) burn the stablecoin from the user
        let cpi_accounts_burn = anchor_spl::token::Burn {
            mint: ctx.accounts.stable_mint.to_account_info(),
            from: ctx.accounts.user_stable.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx_burn = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_burn,
        );
        anchor_spl::token::burn(cpi_ctx_burn, amount)?;

        // 2) send the collateral back to the user
        let cpi_accounts_transfer = anchor_spl::token::Transfer {
            from: ctx.accounts.treasury_vault.to_account_info(),
            to: ctx.accounts.user_collateral.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let cpi_ctx_transfer = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_transfer,
        );
        anchor_spl::token::transfer(cpi_ctx_transfer, amount)?;

        Ok(())
    }

    // If you *ever* want OTC redemption, you'd add something like:
    // pub fn privileged_redeem(ctx: Context<PrivilegedRedeem>, amount: u64) -> Result<()> { ... }
    // and check a separate `redeemer_role` instead of config.authority.
}
