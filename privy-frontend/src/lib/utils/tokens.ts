/**
 * Token utilities for managing token metadata, logos, and display information
 */

// Token emoji data from tokens.json
// This is hardcoded here to avoid build-time issues with importing from public folder
// To update, modify both this file and public/tokens.json
const TOKENS_DATA: Record<string, string> = {
  BLING: "✨",
  STABLECOIN: "🪙",
};

/**
 * Token metadata structure
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  logo: string | null; // Path to logo image or emoji string
  logoType: "image" | "emoji";
  decimals: number;
}

/**
 * Token type enum for easier reference
 */
export enum TokenType {
  BLING = "BLING",
  USDC = "USDC",
  STABLECOIN = "STABLECOIN",
}

/**
 * Token configuration with mint addresses and metadata
 */
export interface TokenConfig {
  type: TokenType;
  mint: string;
  metadata: TokenMetadata;
}

/**
 * Get token metadata from tokens data
 */
function getTokenMetadataFromJson(tokenType: TokenType): TokenMetadata | null {
  const tokenData = TOKENS_DATA[tokenType];
  if (!tokenData) return null;

  // Token data is an emoji string
  return {
    name: tokenType,
    symbol: tokenType,
    logo: tokenData,
    logoType: "emoji",
    decimals: tokenType === TokenType.BLING ? 9 : 6,
  };
}

/**
 * Get token configuration by mint address
 */
export function getTokenConfig(
  mint: string,
  blingMint?: string,
  usdcMint?: string,
  stablecoinMint?: string
): TokenConfig | null {
  const BLING = blingMint || process.env.NEXT_PUBLIC_BLING_MINT || "";
  const USDC = usdcMint || process.env.NEXT_PUBLIC_USDC_MINT || "";
  const STABLECOIN =
    stablecoinMint || process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

  let tokenType: TokenType | null = null;

  if (mint === BLING) {
    tokenType = TokenType.BLING;
  } else if (mint === USDC) {
    tokenType = TokenType.USDC;
  } else if (mint === STABLECOIN) {
    tokenType = TokenType.STABLECOIN;
  } else {
    return null;
  }

  const metadata = getTokenMetadata(tokenType);
  if (!metadata) return null;

  return {
    type: tokenType,
    mint,
    metadata,
  };
}

/**
 * Get token metadata by token type
 */
export function getTokenMetadata(tokenType: TokenType): TokenMetadata | null {
  // Special handling for USDC - use image logo
  if (tokenType === TokenType.USDC) {
    return {
      name: "USD Coin",
      symbol: "USDC",
      logo: "/usd-coin-usdc-logo.png",
      logoType: "image",
      decimals: 6,
    };
  }

  // Get metadata from tokens.json for other tokens
  return getTokenMetadataFromJson(tokenType);
}

/**
 * Get token name by mint address (backward compatibility)
 */
export function getTokenName(
  mint: string,
  blingMint?: string,
  usdcMint?: string,
  stablecoinMint?: string
): string {
  const config = getTokenConfig(mint, blingMint, usdcMint, stablecoinMint);
  return config?.metadata.name || "Token";
}

/**
 * Get token symbol by mint address
 */
export function getTokenSymbol(
  mint: string,
  blingMint?: string,
  usdcMint?: string,
  stablecoinMint?: string
): string {
  const config = getTokenConfig(mint, blingMint, usdcMint, stablecoinMint);
  return config?.metadata.symbol || "TOKEN";
}

/**
 * Get token logo path/emoji by mint address
 */
export function getTokenLogo(
  mint: string,
  blingMint?: string,
  usdcMint?: string,
  stablecoinMint?: string
): { logo: string | null; type: "image" | "emoji" } {
  const config = getTokenConfig(mint, blingMint, usdcMint, stablecoinMint);
  if (!config) return { logo: null, type: "emoji" };

  return {
    logo: config.metadata.logo,
    type: config.metadata.logoType,
  };
}

/**
 * Get all available token configs
 */
export function getAllTokenConfigs(
  blingMint?: string,
  usdcMint?: string,
  stablecoinMint?: string
): TokenConfig[] {
  const configs: TokenConfig[] = [];

  const BLING = blingMint || process.env.NEXT_PUBLIC_BLING_MINT || "";
  const USDC = usdcMint || process.env.NEXT_PUBLIC_USDC_MINT || "";
  const STABLECOIN =
    stablecoinMint || process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

  if (BLING) {
    const config = getTokenConfig(BLING, blingMint, usdcMint, stablecoinMint);
    if (config) configs.push(config);
  }

  if (USDC) {
    const config = getTokenConfig(USDC, blingMint, usdcMint, stablecoinMint);
    if (config) configs.push(config);
  }

  if (STABLECOIN) {
    const config = getTokenConfig(
      STABLECOIN,
      blingMint,
      usdcMint,
      stablecoinMint
    );
    if (config) configs.push(config);
  }

  return configs;
}
