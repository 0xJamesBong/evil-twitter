use anchor_lang::prelude::*;
use anchor_lang::require;
use anchor_lang::solana_program;
use anchor_lang::solana_program::sysvar::instructions::load_instruction_at_checked;

use crate::states::SessionAuthority;

pub fn validate_session_signature<'info>(
    user: &Pubkey,
    expected_index: u8,
    instructions_sysvar: &UncheckedAccount<'info>,
    expires_at: i64,
) -> Result<()> {
    // ---- Load Ed25519 verify instruction from tx instruction list ----
    let ix = load_instruction_at_checked(expected_index as usize, instructions_sysvar)?;

    // ---- Confirm this instruction is the Ed25519 system verifier ----
    require!(
        ix.program_id == solana_program::ed25519_program::ID,
        SessionError::InvalidSignatureInstruction
    );

    //
    // ---- Extract verifying pubkey from instruction data ----
    //
    // Ed25519Verify instruction structure:
    // see solana docs: https://docs.solana.com/developing/runtime-facilities/programs#ed25519-program
    //
    // layout:
    // [0..1]  num_signatures
    // [1..x]  struct describing signatures
    // pubkey is commonly at bytes 16..48
    //
    let signer_pubkey_bytes = &ix.data[16..48];
    let signer_pubkey =
        Pubkey::try_from(signer_pubkey_bytes).map_err(|_| SessionError::UnauthorizedSigner)?;

    // Ensure the validated signature came from the user we expect
    require!(signer_pubkey == *user, SessionError::UnauthorizedSigner);

    Ok(())
}

pub fn assert_session_or_wallet<'info>(
    signer: &Pubkey,
    user: &Pubkey,
    session_opt: Option<&Account<SessionAuthority>>,
    now: i64,
) -> Result<()> {
    // Normal wallet signing → allowed
    if signer == user {
        return Ok(());
    }

    // Session flow
    let session = match session_opt {
        Some(s) => s,
        None => return Err(SessionError::InvalidSessionKey.into()),
    };

    require!(session.user == *user, SessionError::InvalidSessionOwner);
    require!(
        session.session_key == *signer,
        SessionError::InvalidSessionKey
    );
    require!(now < session.expires_at, SessionError::SessionExpired);

    Ok(())
}

#[error_code]
pub enum SessionError {
    #[msg("Invalid session key")]
    InvalidSessionKey,
    #[msg("Invalid session owner")]
    InvalidSessionOwner,
    #[msg("Session expired")]
    SessionExpired,
    #[msg("Invalid or missing Ed25519 signature verification instruction")]
    InvalidSignatureInstruction,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
}
