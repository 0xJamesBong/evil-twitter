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

    // -------------------------------------------------------------------------
    // USER + VAULTS
    // -------------------------------------------------------------------------

    // when the user first signs in, we will need the user to create a user, which will create their deposit vault
    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> {
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
}
