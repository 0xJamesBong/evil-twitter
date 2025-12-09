use solana_sdk::pubkey::Pubkey;

// PDA seeds matching the program
const CONFIG_SEED: &[u8] = b"config";
const VALID_PAYMENT_SEED: &[u8] = b"valid_payment";
const USER_ACCOUNT_SEED: &[u8] = b"user_account";
const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";
const USER_VAULT_TOKEN_ACCOUNT_SEED: &[u8] = b"user_vault_token_account";
const POST_ACCOUNT_SEED: &[u8] = b"post_account";
const POSITION_SEED: &[u8] = b"position";
const POST_POT_AUTHORITY_SEED: &[u8] = b"post_pot_authority";
const POST_POT_TOKEN_ACCOUNT_SEED: &[u8] = b"post_pot_token_account";
const PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED: &[u8] = b"protocol_treasury_token_account";
const POST_MINT_PAYOUT_SEED: &[u8] = b"post_mint_payout";
const USER_POST_MINT_CLAIM_SEED: &[u8] = b"user_post_mint_claim";
const SESSION_AUTHORITY_SEED: &[u8] = b"session_authority";
const TIP_VAULT_SEED: &[u8] = b"tip_vault";
const TIP_VAULT_AUTH_SEED: &[u8] = b"tip_vault_auth";
const TIP_VAULT_TOKEN_ACCOUNT_SEED: &[u8] = b"tip_vault_token_account";

/// Derive the Config PDA
pub fn get_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], program_id)
}

/// Derive the UserAccount PDA
pub fn get_user_account_pda(program_id: &Pubkey, user_wallet: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[USER_ACCOUNT_SEED, user_wallet.as_ref()], program_id)
}

/// Derive the Post PDA
pub fn get_post_pda(program_id: &Pubkey, post_id_hash: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[POST_ACCOUNT_SEED, post_id_hash], program_id)
}

/// Derive the UserPostPosition PDA
pub fn get_position_pda(
    program_id: &Pubkey,
    post_pda: &Pubkey,
    user_wallet: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[POSITION_SEED, post_pda.as_ref(), user_wallet.as_ref()],
        program_id,
    )
}

/// Derive the Post Pot Token Account PDA
pub fn get_post_pot_token_account_pda(
    program_id: &Pubkey,
    post_pda: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            POST_POT_TOKEN_ACCOUNT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        program_id,
    )
}

/// Derive the Post Pot Authority PDA
pub fn get_post_pot_authority_pda(program_id: &Pubkey, post_pda: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[POST_POT_AUTHORITY_SEED, post_pda.as_ref()], program_id)
}

/// Derive the User Vault Token Account PDA
pub fn get_user_vault_token_account_pda(
    program_id: &Pubkey,
    user_wallet: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            USER_VAULT_TOKEN_ACCOUNT_SEED,
            user_wallet.as_ref(),
            token_mint.as_ref(),
        ],
        program_id,
    )
}

/// Derive the Vault Authority PDA
pub fn get_vault_authority_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[VAULT_AUTHORITY_SEED], program_id)
}

/// Derive the Valid Payment PDA
pub fn get_valid_payment_pda(program_id: &Pubkey, token_mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[VALID_PAYMENT_SEED, token_mint.as_ref()], program_id)
}

/// Derive the Protocol Treasury Token Account PDA
pub fn get_protocol_treasury_token_account_pda(
    program_id: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, token_mint.as_ref()],
        program_id,
    )
}

/// Derive the Post Mint Payout PDA
pub fn get_post_mint_payout_pda(
    program_id: &Pubkey,
    post_pda: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            POST_MINT_PAYOUT_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
        ],
        program_id,
    )
}

/// Derive the User Post Mint Claim PDA
pub fn get_user_post_mint_claim_pda(
    program_id: &Pubkey,
    post_pda: &Pubkey,
    token_mint: &Pubkey,
    user_wallet: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            USER_POST_MINT_CLAIM_SEED,
            post_pda.as_ref(),
            token_mint.as_ref(),
            user_wallet.as_ref(),
        ],
        program_id,
    )
}

/// Derive the Session Authority PDA
pub fn get_session_authority_pda(
    program_id: &Pubkey,
    user_wallet: &Pubkey,
    session_key: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SESSION_AUTHORITY_SEED,
            user_wallet.as_ref(),
            session_key.as_ref(),
        ],
        program_id,
    )
}

/// Derive the Tip Vault PDA
pub fn get_tip_vault_pda(
    program_id: &Pubkey,
    owner: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[TIP_VAULT_SEED, owner.as_ref(), token_mint.as_ref()],
        program_id,
    )
}

/// Derive the Tip Vault Authority PDA
pub fn get_tip_vault_authority_pda(
    program_id: &Pubkey,
    owner: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[TIP_VAULT_AUTH_SEED, owner.as_ref(), token_mint.as_ref()],
        program_id,
    )
}

/// Derive the Tip Vault Token Account PDA
pub fn get_tip_vault_token_account_pda(
    program_id: &Pubkey,
    owner: &Pubkey,
    token_mint: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            TIP_VAULT_TOKEN_ACCOUNT_SEED,
            owner.as_ref(),
            token_mint.as_ref(),
        ],
        program_id,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pda_derivations() {
        use std::str::FromStr;
        let program_id = Pubkey::from_str("4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm").unwrap();
        let user_wallet = Pubkey::from_str("11111111111111111111111111111111").unwrap();
        let post_id_hash = [0u8; 32];

        let (config_pda, _) = get_config_pda(&program_id);
        assert_eq!(config_pda.to_string().len(), 44); // Base58 encoded pubkey length

        let (user_account_pda, _) = get_user_account_pda(&program_id, &user_wallet);
        assert_eq!(user_account_pda.to_string().len(), 44);

        let (post_pda, _) = get_post_pda(&program_id, &post_id_hash);
        assert_eq!(post_pda.to_string().len(), 44);

        let (vault_authority_pda, _) = get_vault_authority_pda(&program_id);
        assert_eq!(vault_authority_pda.to_string().len(), 44);
    }
}
