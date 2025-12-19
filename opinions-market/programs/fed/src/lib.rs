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

declare_id!("GLQEgZvtw6JdtF4p1cGsDBh3ucCVrmpZjPuyzqp6yMTo");

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

#[derive(Accounts)]
pub struct Ping {}

#[program]
pub mod fed {

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
}
