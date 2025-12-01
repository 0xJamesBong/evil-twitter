/**
 * Utility functions for formatting various data types
 */

/**
 * Formats a social score number with locale-specific formatting
 * @param score - The social score to format
 * @returns Formatted string or "N/A" if null/undefined
 */
export function formatSocialScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "N/A";
  return score.toLocaleString();
}

/**
 * Formats a token balance by converting from raw units to human-readable format
 * @param balance - The token balance in raw units (lamports)
 * @param decimals - The number of decimals for the token
 * @returns Formatted string with 4 decimal places, "N/A" if null/undefined, or "0" if balance is 0
 */
export function formatTokenBalance(
  balance: number | null | undefined,
  decimals: number
): string {
  if (balance === null || balance === undefined) return "N/A";
  if (balance === 0) return "0";
  return (balance / Math.pow(10, decimals)).toFixed(4);
}

/**
 * Gets the display name for a token based on its mint address
 * @param mint - The token mint address
 * @param blingMint - BLING token mint address (optional, defaults to env var)
 * @param usdcMint - USDC token mint address (optional, defaults to env var)
 * @param stablecoinMint - Stablecoin token mint address (optional, defaults to env var)
 * @returns The token display name
 */
export function getTokenName(
  mint: string,
  blingMint?: string,
  usdcMint?: string,
  stablecoinMint?: string
): string {
  const BLING = blingMint || process.env.NEXT_PUBLIC_BLING_MINT || "";
  const USDC = usdcMint || process.env.NEXT_PUBLIC_USDC_MINT || "";
  const STABLECOIN =
    stablecoinMint || process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

  if (mint === BLING) return "BLING";
  if (mint === USDC) return "USDC";
  if (mint === STABLECOIN) return "Stablecoin";
  return "Token";
}
