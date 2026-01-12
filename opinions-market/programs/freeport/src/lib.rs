use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

pub mod instructions;

pub mod pda_seeds;
pub mod states;

use instructions::*;
use states::*;

declare_id!("H4Ubn85Eo9rqaSyb9menXWFuDguK1Bc9XrRAyS9pESpX");

#[error_code]
pub enum ErrorCode {
    #[msg("Post is not open")]
    PostNotOpen,
    #[msg("Post is expired")]
    PostExpired,
    #[msg("Post already settled")]
    PostAlreadySettled,
    #[msg("Post not yet expired")]
    PostNotExpired,
    #[msg("Post not settled")]
    PostNotSettled,
    #[msg("No winner for this post")]
    NoWinner,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Zero votes not allowed")]
    ZeroVotes,
    #[msg("Mint is not enabled")]
    MintNotEnabled,
    #[msg("BLING cannot be registered as an alternative payment")]
    BlingCannotBeAlternativePayment,
    #[msg("Alternative payment already registered for this mint")]
    AlternativePaymentAlreadyRegistered,
    #[msg("Unauthorized: user account does not belong to the payer")]
    Unauthorized,
    #[msg("Invalid parent post")]
    InvalidParentPost,
    #[msg("Invalid or missing Ed25519 signature verification instruction")]
    InvalidSignatureInstruction,
    #[msg("Session expired or invalid timestamp")]
    SessionExpired,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Invalid post relation")]
    InvalidRelation,
    #[msg("Answer must target a Question post")]
    AnswerMustTargetQuestion,
    #[msg("Answer target must be a Root post")]
    AnswerTargetNotRoot,
    #[msg("Zero tip amount not allowed")]
    ZeroTipAmount,
    #[msg("Cannot tip yourself")]
    CannotTipSelf,
    #[msg("No tips to claim")]
    NoTipsToClaim,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Cannot send tokens to yourself")]
    CannotSendToSelf,
    #[msg("Token is not withdrawable")]
    TokenNotWithdrawable,
    #[msg("Invalid from account - must be Fed-owned for transfer_out_of_fed")]
    InvalidFrom,
    #[msg("Invalid vault authority")]
    BadAuthority,
    #[msg("Invalid to account - must be Fed-owned for transfer_into_fed")]
    InvalidTo,
    #[msg("Insufficient funds in user vault")]
    InsufficientFundsInUserVault,
}

#[program]
pub mod freeport {

    use super::*;
    // Don't import from instructions module - use re-exports from crate root

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let cfg = &mut ctx.accounts.freeport_config;

        let new_cfg = FreeportConfig::new(
            *ctx.accounts.admin.key,
            ctx.accounts.payer.key(),
            ctx.bumps.freeport_config,
            [0; 7],
        );

        cfg.admin = new_cfg.admin;
        cfg.payer_authroity = new_cfg.payer_authroity;

        cfg.bump = new_cfg.bump;
        cfg.padding = new_cfg.padding;

        Ok(())
    }

    pub fn register_valid_collection(
        ctx: Context<RegisterValidCollection>,
        base_price_in_dollar: u64,
        enabled: bool,
        allow_deposit: bool,
        allow_withdraw: bool,
    ) -> Result<()> {
        // Note: Duplicate registration is prevented by the `init` constraint on valid_collection account.
        // If the account already exists (same PDA seeds), init will fail before this function is called.

        let valid_collection = &mut ctx.accounts.valid_collection;
        let new_valid_collection = ValidCollection::new(
            ctx.accounts.collection_mint.key(),
            base_price_in_dollar,
            enabled,
            allow_deposit,
            allow_withdraw,
        );

        valid_collection.nft_mint = new_valid_collection.nft_mint;
        valid_collection.base_price_in_dollar = new_valid_collection.base_price_in_dollar;
        valid_collection.enabled = new_valid_collection.enabled;
        valid_collection.allow_deposit = new_valid_collection.allow_deposit;
        valid_collection.allow_withdraw = new_valid_collection.allow_withdraw;
        valid_collection.bump = ctx.bumps.valid_collection;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount);

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_token_ata.to_account_info(),
            to: ctx.accounts.user_vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        anchor_spl::token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    /// Withdraw with possible penalty based on social interactions.
    /// You can later implement:
    ///   effective_amount = amount * (10000 - user.withdraw_penalty_bps()) / 10000
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // later you’ll put the social penalty logic here
        let effective_amount = amount;

        let vault_bump = ctx.bumps.vault_authority;
        let seeds: &[&[&[u8]]] = &[&[FREEPORT_VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_vault_token_account.to_account_info(),
            to: ctx.accounts.user_token_dest_ata.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, effective_amount)?;
        Ok(())
    }

    /// Send tokens from sender's user vault to recipient's user vault.
    /// Direct vault-to-vault transfer without intermediate accounts.
    pub fn send_token(ctx: Context<SendToken>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Auth: session or wallet via CPI
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.sender.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            now,
        )?;
        // Validate amount
        require!(amount > 0, ErrorCode::ZeroAmount);

        // Validate recipient != sender
        require!(
            ctx.accounts.recipient.key() != ctx.accounts.sender_user_account.key(),
            ErrorCode::CannotSendToSelf
        );

        // Transfer from sender's vault to recipient's vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[FREEPORT_VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx
                .accounts
                .sender_user_vault_token_account
                .to_account_info(),
            to: ctx
                .accounts
                .recipient_user_vault_token_account
                .to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            vault_authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        Ok(())
    }
}
