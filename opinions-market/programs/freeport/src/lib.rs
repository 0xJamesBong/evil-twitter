use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

pub mod instructions;

pub mod pda_seeds;
pub mod states;
pub mod utils;

use instructions::*;
use states::*;
use utils::*;

declare_id!("H4Ubn85Eo9rqaSyb9menXWFuDguK1Bc9XrRAyS9pESpX");

#[error_code]
pub enum ErrorCode {
    #[msg("Collection is not enabled")]
    CollectionNotEnabled,
    #[msg("Collection is not allowed for deposit")]
    CollectionNotAllowedForDeposit,
    #[msg("Collection is not allowed for withdrawal")]
    CollectionNotAllowedForWithdrawal,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Cannot send tokens to yourself")]
    CannotSendToSelf,
    #[msg("Not an NFT")]
    NotNft,

    #[msg("NFT is locked")]
    NftLocked,
    #[msg("Unauthorized")]
    Unauthorized,
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
        let new_valid_collection =
            ValidCollection::new(base_price_in_dollar, enabled, allow_deposit, allow_withdraw);

        valid_collection.base_price_in_dollar = new_valid_collection.base_price_in_dollar;
        valid_collection.enabled = new_valid_collection.enabled;
        valid_collection.allow_deposit = new_valid_collection.allow_deposit;
        valid_collection.allow_withdraw = new_valid_collection.allow_withdraw;
        valid_collection.bump = ctx.bumps.valid_collection;

        Ok(())
    }

    pub fn deposit_nft(ctx: Context<DepositNft>) -> Result<()> {
        // 1) Enforce NFT-ness (minimum viable checks)
        require!(ctx.accounts.nft_mint.decimals == 0, ErrorCode::NotNft);
        // supply check depends on Mint fields; with SPL it’s `supply`
        require!(ctx.accounts.nft_mint.supply == 1, ErrorCode::NotNft);

        // 2) Verify metadata -> verified collection == collection_mint
        // You must implement this check in code (Anchor constraints can't parse metadata).
        // Minimal pattern: deserialize mpl_token_metadata::state::Metadata and validate:
        // - metadata.mint == nft_mint
        // - metadata.collection.is_some()
        // - metadata.collection.verified == true
        // - metadata.collection.key == collection_mint.key()
        verify_collection(
            &ctx.accounts.metadata,
            &ctx.accounts.nft_mint.key(),
            &ctx.accounts.collection_mint.key(),
        )?;

        // 3) Transfer 1 token from user ATA into freeport vault
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.user_nft_ata.to_account_info(),
            to: ctx.accounts.freeport_nft_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, 1)?;

        Ok(())
    }

    pub fn withdraw_nft(ctx: Context<WithdrawNft>) -> Result<()> {
        // Optional but recommended: verify metadata collection again
        verify_collection(
            &ctx.accounts.metadata,
            &ctx.accounts.nft_mint.key(),
            &ctx.accounts.collection_mint.key(),
        )?;

        // Optional: enforce not locked
        // require!(!ctx.accounts.lock.locked, ErrorCode::NftLocked);

        let bump = ctx.bumps.freeport_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[FREEPORT_AUTHORITY_SEED, &[bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.freeport_nft_vault.to_account_info(),
            to: ctx.accounts.dest_token_account.to_account_info(),
            authority: ctx.accounts.freeport_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, 1)?;

        Ok(())
    }

    pub fn send_nft(ctx: Context<SendNft>) -> Result<()> {
        // 1) Authenticate caller
        persona::cpi::check_session_or_wallet(
            CpiContext::new(
                ctx.accounts.persona_program.to_account_info(),
                persona::cpi::accounts::CheckSessionOrWallet {
                    user: ctx.accounts.sender.to_account_info(),
                    session_key: ctx.accounts.session_key.to_account_info(),
                    session_authority: ctx.accounts.session_authority.to_account_info(),
                },
            ),
            Clock::get()?.unix_timestamp,
        )?;

        let lock = &mut ctx.accounts.lock;

        // 2) Must own NFT
        require!(
            lock.owner == ctx.accounts.sender_user_account.key(),
            ErrorCode::Unauthorized
        );

        // 3) Must not be locked
        require!(!lock.locked, ErrorCode::NftLocked);

        // 4) Transfer custody
        let bump = ctx.bumps.freeport_authority;
        let seeds: &[&[&[u8]]] = &[&[FREEPORT_AUTHORITY_SEED, &[bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.sender_vault.to_account_info(),
            to: ctx.accounts.recipient_vault.to_account_info(),
            authority: ctx.accounts.freeport_authority.to_account_info(),
        };

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                seeds,
            ),
            1,
        )?;

        // 5) Update entitlement
        lock.owner = ctx.accounts.recipient.key();

        Ok(())
    }
}
