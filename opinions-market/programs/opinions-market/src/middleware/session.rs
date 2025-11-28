use anchor_lang::prelude::*;
use anchor_lang::require;

use crate::state::SessionAuthority;

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
}
