import { PublicKey } from "@solana/web3.js";

/**
 * Token mint addresses configuration
 * Centralized configuration for all token mints used in the application
 */

// String versions (for use in GraphQL queries, comparisons, etc.)
export const BLING_MINT_STR =
  process.env.NEXT_PUBLIC_BLING_MINT ||
  "bbb9w3ZidNJJGm4TKbhkCXqB9XSnzsjTedmJ5F2THX8";

export const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT || "";

export const STABLECOIN_MINT_STR = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

// PublicKey versions (for Solana operations)
export const BLING_MINT = new PublicKey(BLING_MINT_STR);

export const USDC_MINT = USDC_MINT_STR ? new PublicKey(USDC_MINT_STR) : null;

export const STABLECOIN_MINT = STABLECOIN_MINT_STR
  ? new PublicKey(STABLECOIN_MINT_STR)
  : null;

// Array of all available token mint strings (filtered to exclude empty strings)
export const AVAILABLE_TOKEN_MINTS = [
  BLING_MINT_STR,
  ...(USDC_MINT_STR ? [USDC_MINT_STR] : []),
  ...(STABLECOIN_MINT_STR ? [STABLECOIN_MINT_STR] : []),
].filter(Boolean);

// Array of all available token mint PublicKeys (filtered to exclude null)
export const AVAILABLE_TOKEN_MINT_PUBKEYS = [
  BLING_MINT,
  ...(USDC_MINT ? [USDC_MINT] : []),
  ...(STABLECOIN_MINT ? [STABLECOIN_MINT] : []),
].filter(Boolean) as PublicKey[];

// Legacy exports for backward compatibility (deprecated, use BLING_MINT_STR instead)
/** @deprecated Use BLING_MINT_STR instead */
export const BLING_MINT_LEGACY = BLING_MINT_STR;

/** @deprecated Use USDC_MINT_STR instead */
export const USDC_MINT_LEGACY = USDC_MINT_STR;

/** @deprecated Use STABLECOIN_MINT_STR instead */
export const STABLECOIN_MINT_LEGACY = STABLECOIN_MINT_STR;

