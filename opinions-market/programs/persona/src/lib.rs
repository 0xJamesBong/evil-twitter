use crate::pda_seeds::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
pub mod constants;
pub mod instructions;
pub mod math;
pub mod middleware;
pub mod pda_seeds;
pub mod states;
use constants::*;
use instructions::*;
use states::*;

declare_id!("3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d");

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
}

#[event]
pub struct TipReceived {
    pub owner: Pubkey,
    pub sender: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub vault_balance: u64,
}

#[event]
pub struct TipsClaimed {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
}

#[derive(Accounts)]
pub struct Ping {}

#[program]
pub mod persona {

    use anchor_lang::solana_program::{ed25519_program, program::invoke};

    use crate::middleware::session::{assert_session_or_wallet, validate_session_signature};
    use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

    use super::*;

    // Don't import from instructions module - use re-exports from crate root
    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        panic!("SHIT");
        Ok(())
    }
    pub fn initialize(
        ctx: Context<Initialize>,

        base_duration_secs: u32,
        max_duration_secs: u32,
        extension_per_vote_secs: u32,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;

        let new_cfg = Config::new(
            *ctx.accounts.admin.key,
            ctx.accounts.payer.key(),
            ctx.accounts.bling_mint.key(),
            base_duration_secs,
            max_duration_secs,
            extension_per_vote_secs,
            ctx.bumps.config,
            [0; 7],
        );

        cfg.admin = new_cfg.admin;
        cfg.payer_authroity = new_cfg.payer_authroity;
        cfg.bling_mint = new_cfg.bling_mint;

        cfg.base_duration_secs = new_cfg.base_duration_secs;
        cfg.max_duration_secs = new_cfg.max_duration_secs;
        cfg.extension_per_vote_secs = new_cfg.extension_per_vote_secs;

        cfg.bump = new_cfg.bump;
        cfg.padding = new_cfg.padding;

        let valid_payment = &mut ctx.accounts.valid_payment;

        let new_valid_payment = ValidPayment::new(ctx.accounts.bling_mint.key(), 1, true, false);

        valid_payment.token_mint = new_valid_payment.token_mint;
        valid_payment.price_in_bling = new_valid_payment.price_in_bling;
        valid_payment.enabled = new_valid_payment.enabled;
        valid_payment.withdrawable = new_valid_payment.withdrawable; // BLING is not withdrawable by default
        valid_payment.bump = ctx.bumps.valid_payment; // Use the actual bump from Anchor

        Ok(())
    }

    pub fn register_valid_payment(
        ctx: Context<RegisterValidPayment>,
        price_in_bling: u64, // How much is 1 token in BLING -
        withdrawable: bool,  // Whether this token can be withdrawn from vault
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;

        // Note: Duplicate registration is prevented by the `init` constraint on alternative_payment account.
        // If the account already exists (same PDA seeds), init will fail before this function is called.

        let valid_payment = &mut ctx.accounts.valid_payment;
        let new_valid_payment = ValidPayment::new(
            ctx.accounts.token_mint.key(),
            price_in_bling,
            true,
            withdrawable,
        );

        valid_payment.token_mint = new_valid_payment.token_mint;
        valid_payment.price_in_bling = new_valid_payment.price_in_bling;
        valid_payment.enabled = new_valid_payment.enabled;
        valid_payment.withdrawable = new_valid_payment.withdrawable;
        valid_payment.bump = ctx.bumps.valid_payment; // Use the actual bump from Anchor

        Ok(())
    }

    /// Update the withdrawable flag for a valid payment token
    pub fn update_valid_payment_withdrawable(
        ctx: Context<ModifyAcceptedMint>,
        withdrawable: bool,
    ) -> Result<()> {
        let valid_payment = &mut ctx.accounts.accepted_mint;
        valid_payment.withdrawable = withdrawable;
        Ok(())
    }

    // -------------------------------------------------------------------------
    // USER + VAULTS
    // -------------------------------------------------------------------------

    // when the user first signs in, we will need the user to create a user, which will create their deposit vault
    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let user_account = &mut ctx.accounts.user_account;
        let new_user_account = UserAccount::new(ctx.accounts.user.key(), ctx.bumps.user_account);

        user_account.user = new_user_account.user;
        user_account.social_score = new_user_account.social_score;
        user_account.attack_surface = new_user_account.attack_surface;
        user_account.bump = new_user_account.bump;

        Ok(())
    }

    // to be called only after create_user
    pub fn register_session(ctx: Context<RegisterSession>, expected_index: u8) -> Result<()> {
        // // ---- Load Ed25519 verify instruction from tx instruction list ----
        // let ix = load_instruction_at_checked(
        //     expected_index as usize,
        //     &ctx.accounts.instructions_sysvar,
        // )?;

        // // ---- Confirm this instruction is the Ed25519 system verifier ----
        // require!(
        //     ix.program_id == ed25519_program::ID,
        //     ErrorCode::InvalidSignatureInstruction
        // );

        // //
        // // ---- Extract verifying pubkey from instruction data ----
        // //
        // // Ed25519Verify instruction structure:
        // // see solana docs: https://docs.solana.com/developing/runtime-facilities/programs#ed25519-program
        // //
        // // layout:
        // // [0..1]  num_signatures
        // // [1..x]  struct describing signatures
        // // pubkey is commonly at bytes 16..48
        // //
        // let signer_pubkey_bytes = &ix.data[16..48];
        // let signer_pubkey =
        //     Pubkey::try_from(signer_pubkey_bytes).map_err(|_| ErrorCode::UnauthorizedSigner)?;

        // // Ensure the validated signature came from the user we expect
        // require!(
        //     signer_pubkey == ctx.accounts.user.key(),
        //     ErrorCode::UnauthorizedSigner
        // );

        let now = Clock::get()?.unix_timestamp;
        let expires_at = now + 60 * 60 * 24 * 30; // 30 days

        validate_session_signature(
            &ctx.accounts.user.key(),
            expected_index,
            &ctx.accounts.instructions_sysvar,
            expires_at,
        )?;

        // ---- Check expiry ----
        // let now = Clock::get()?.unix_timestamp;
        // require!(expires_at > now, ErrorCode::SessionExpired);

        // ---- Initialize SessionAuthority PDA ----
        let session = &mut ctx.accounts.session_authority;
        session.user = ctx.accounts.user.key();
        session.session_key = ctx.accounts.session_key.key();
        session.expires_at = expires_at;
        session.privileges_hash = [0u8; 32];
        session.bump = ctx.bumps.session_authority;

        Ok(())
    }

    /// User deposits from their wallet into the program-controlled vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // No logic needed—Anchor already checked mint is allowed.
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
        let seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

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

    /// Tip another user from sender's vault to recipient's tip vault.
    /// Tips accumulate in the recipient's tip vault until they claim.
    pub fn tip(ctx: Context<Tip>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Determine actual signer (could be sender wallet or session key)
        let signer = ctx.accounts.sender.key();

        // Auth: session or wallet
        assert_session_or_wallet(
            &signer,
            &ctx.accounts.sender_user_account.user,
            Some(&ctx.accounts.session_authority),
            now,
        )?;

        // Validate amount
        require!(amount > 0, ErrorCode::ZeroTipAmount);

        // Validate recipient != sender
        require!(
            ctx.accounts.recipient.key() != ctx.accounts.sender_user_account.user,
            ErrorCode::CannotTipSelf
        );

        // Initialize TipVault if needed (init_if_needed will create it if missing)
        let tip_vault = &mut ctx.accounts.tip_vault;
        let is_new = tip_vault.owner == Pubkey::default();

        if is_new {
            let new_tip_vault = TipVault::new(
                ctx.accounts.recipient.key(),
                ctx.accounts.token_mint.key(),
                ctx.bumps.tip_vault,
            );
            tip_vault.owner = new_tip_vault.owner;
            tip_vault.token_mint = new_tip_vault.token_mint;
            tip_vault.unclaimed_amount = new_tip_vault.unclaimed_amount;
            tip_vault.bump = new_tip_vault.bump;
        } else {
            // Validate existing tip vault matches recipient and mint
            require!(
                tip_vault.owner == ctx.accounts.recipient.key(),
                ErrorCode::Unauthorized
            );
            require!(
                tip_vault.token_mint == ctx.accounts.token_mint.key(),
                ErrorCode::Unauthorized
            );
        }

        // Transfer from sender's vault to tip vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx
                .accounts
                .sender_user_vault_token_account
                .to_account_info(),
            to: ctx.accounts.tip_vault_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            vault_authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, amount)?;

        // Increment unclaimed_amount
        tip_vault.unclaimed_amount = tip_vault
            .unclaimed_amount
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // Emit event
        emit!(TipReceived {
            owner: tip_vault.owner,
            sender: ctx.accounts.sender_user_account.user,
            token_mint: ctx.accounts.token_mint.key(),
            amount,
            vault_balance: ctx.accounts.tip_vault_token_account.amount,
        });

        Ok(())
    }
    /// Claim all tips from tip vault to owner's main vault.
    /// All-or-nothing: claims entire vault balance.
    pub fn claim_tips(ctx: Context<ClaimTips>) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Determine actual signer (could be owner wallet or session key)
        let signer = ctx.accounts.owner.key();

        // Auth: session or wallet
        assert_session_or_wallet(
            &signer,
            &ctx.accounts.user_account.user,
            Some(&ctx.accounts.session_authority),
            now,
        )?;

        let tip_vault = &mut ctx.accounts.tip_vault;

        // Validate tip vault owner matches
        require!(
            tip_vault.owner == ctx.accounts.user_account.user,
            ErrorCode::Unauthorized
        );
        require!(
            tip_vault.token_mint == ctx.accounts.token_mint.key(),
            ErrorCode::Unauthorized
        );

        // Read vault balance (source of truth)
        let claim_amount = ctx.accounts.tip_vault_token_account.amount;
        require!(claim_amount > 0, ErrorCode::NoTipsToClaim);

        // Transfer from tip vault to owner's main vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.tip_vault_token_account.to_account_info(),
            to: ctx
                .accounts
                .owner_user_vault_token_account
                .to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            vault_authority_seeds,
        );
        anchor_spl::token::transfer(cpi_ctx, claim_amount)?;

        // Reset unclaimed_amount
        tip_vault.unclaimed_amount = 0;

        // Emit event
        emit!(TipsClaimed {
            owner: tip_vault.owner,
            token_mint: ctx.accounts.token_mint.key(),
            amount: claim_amount,
        });

        Ok(())
    }

    /// Send tokens from sender's user vault to recipient's user vault.
    /// Direct vault-to-vault transfer without intermediate accounts.
    pub fn send_token(ctx: Context<SendToken>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // Determine actual signer (could be sender wallet or session key)
        let signer = ctx.accounts.sender.key();

        // Auth: session or wallet
        assert_session_or_wallet(
            &signer,
            &ctx.accounts.sender_user_account.user,
            Some(&ctx.accounts.session_authority),
            now,
        )?;

        // Validate amount
        require!(amount > 0, ErrorCode::ZeroAmount);

        // Validate recipient != sender
        require!(
            ctx.accounts.recipient.key() != ctx.accounts.sender_user_account.user,
            ErrorCode::CannotSendToSelf
        );

        // Transfer from sender's vault to recipient's vault
        let vault_bump = ctx.bumps.vault_authority;
        let vault_authority_seeds: &[&[&[u8]]] = &[&[VAULT_AUTHORITY_SEED, &[vault_bump]]];

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
