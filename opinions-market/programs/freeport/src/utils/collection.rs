use crate::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;
use anchor_lang::solana_program::pubkey::Pubkey;
use mpl_token_metadata::accounts::Metadata;

pub fn verify_collection(
    metadata_ai: &AccountInfo,
    nft_mint: &Pubkey,
    expected_collection_mint: &Pubkey,
) -> Result<()> {
    // A) Assert metadata account is the canonical Metaplex Metadata PDA for this mint
    let (expected_metadata_pda, _) = Pubkey::find_program_address(
        &[
            b"metadata",
            mpl_token_metadata::ID.as_ref(),
            nft_mint.as_ref(),
        ],
        &mpl_token_metadata::ID,
    );

    require_keys_eq!(
        metadata_ai.key(),
        expected_metadata_pda,
        ErrorCode::Unauthorized
    );

    // B) Deserialize Metaplex metadata
    let metadata = Metadata::try_from(metadata_ai).map_err(|_| ProgramError::InvalidAccountData)?;

    // C) Mint must match
    require_keys_eq!(metadata.mint, *nft_mint, ErrorCode::Unauthorized);

    // D) Must have verified collection
    let collection = metadata.collection.ok_or(ErrorCode::CollectionNotEnabled)?;
    require!(collection.verified, ErrorCode::CollectionNotEnabled);

    // E) Collection key must match expected collection mint
    require_keys_eq!(
        collection.key,
        *expected_collection_mint,
        ErrorCode::CollectionNotEnabled
    );

    Ok(())
}
