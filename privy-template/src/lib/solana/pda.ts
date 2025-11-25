import { PublicKey } from "@solana/web3.js";

// PDA seeds matching the program
const CONFIG_SEED = Buffer.from("config");
const VALID_PAYMENT_SEED = Buffer.from("valid_payment");
const USER_ACCOUNT_SEED = Buffer.from("user_account");
const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");
const USER_VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("user_vault_token_account");
const POST_ACCOUNT_SEED = Buffer.from("post_account");
const POSITION_SEED = Buffer.from("position");
const POST_POT_AUTHORITY_SEED = Buffer.from("post_pot_authority");
const POST_POT_TOKEN_ACCOUNT_SEED = Buffer.from("post_pot_token_account");
const PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED = Buffer.from(
  "protocol_treasury_token_account"
);
const POST_MINT_PAYOUT_SEED = Buffer.from("post_mint_payout");
const USER_POST_MINT_CLAIM_SEED = Buffer.from("user_post_mint_claim");

export function getConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

export function getUserAccountPda(
  programId: PublicKey,
  userWallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_ACCOUNT_SEED, userWallet.toBuffer()],
    programId
  );
}

export function getPostPda(
  programId: PublicKey,
  postIdHash: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POST_ACCOUNT_SEED, postIdHash],
    programId
  );
}

export function getPositionPda(
  programId: PublicKey,
  postPda: PublicKey,
  userWallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, postPda.toBuffer(), userWallet.toBuffer()],
    programId
  );
}

export function getPostPotTokenAccountPda(
  programId: PublicKey,
  postPda: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POST_POT_TOKEN_ACCOUNT_SEED, postPda.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}

export function getPostPotAuthorityPda(
  programId: PublicKey,
  postPda: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POST_POT_AUTHORITY_SEED, postPda.toBuffer()],
    programId
  );
}

export function getUserVaultTokenAccountPda(
  programId: PublicKey,
  userWallet: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      USER_VAULT_TOKEN_ACCOUNT_SEED,
      userWallet.toBuffer(),
      tokenMint.toBuffer(),
    ],
    programId
  );
}

export function getVaultAuthorityPda(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_AUTHORITY_SEED], programId);
}

export function getValidPaymentPda(
  programId: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VALID_PAYMENT_SEED, tokenMint.toBuffer()],
    programId
  );
}

export function getProtocolTreasuryTokenAccountPda(
  programId: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, tokenMint.toBuffer()],
    programId
  );
}

export function getPostMintPayoutPda(
  programId: PublicKey,
  postPda: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POST_MINT_PAYOUT_SEED, postPda.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}

export function getUserPostMintClaimPda(
  programId: PublicKey,
  postPda: PublicKey,
  tokenMint: PublicKey,
  userWallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      USER_POST_MINT_CLAIM_SEED,
      postPda.toBuffer(),
      tokenMint.toBuffer(),
      userWallet.toBuffer(),
    ],
    programId
  );
}
