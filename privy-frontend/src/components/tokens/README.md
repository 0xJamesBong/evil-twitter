# Token Display Components

This directory contains components and utilities for displaying tokens with their logos throughout the application.

## Components

### `TokenDisplay`
A component that displays a token name/symbol alongside its logo (emoji or image).

**Props:**
- `mint`: Token mint address (required)
- `blingMint`, `usdcMint`, `stablecoinMint`: Optional mint addresses for token identification
- `showSymbol`: Show symbol instead of full name (default: `false`)
- `size`: Size preset - `"small" | "medium" | "large"` (default: `"medium"`)
- `logoSize`: Custom logo size in pixels (overrides size preset)
- `variant`: Typography variant (optional)
- `sx`: Custom MUI sx prop for styling

**Example:**
```tsx
<TokenDisplay 
  mint={BLING_MINT} 
  size="small" 
  showSymbol 
/>
```

### `TokenLogo`
A component that displays just the token logo (emoji or image) without text.

**Props:**
- `mint`: Token mint address (required)
- `blingMint`, `usdcMint`, `stablecoinMint`: Optional mint addresses
- `size`: Logo size in pixels (default: `24`)
- `sx`: Custom MUI sx prop for styling

**Example:**
```tsx
<TokenLogo 
  mint={USDC_MINT} 
  size={32} 
/>
```

## Utilities

### `@/lib/utils/tokens`

Utility functions for token metadata:

- `getTokenConfig(mint, ...)`: Get full token configuration
- `getTokenName(mint, ...)`: Get token display name
- `getTokenSymbol(mint, ...)`: Get token symbol
- `getTokenLogo(mint, ...)`: Get token logo path/emoji and type
- `getAllTokenConfigs(...)`: Get all available token configs

## Adding New Tokens

1. **Add emoji to `public/tokens.json`:**
   ```json
   {
     "BLING": "✨",
     "STABLECOIN": "🪙",
     "NEW_TOKEN": "🆕"
   }
   ```

2. **Update `src/lib/utils/tokens.ts`:**
   - Add the token to `TOKENS_DATA` constant
   - Add the token type to `TokenType` enum
   - Update `getTokenMetadata()` if special handling is needed

3. **For image logos (like USDC):**
   - Add the image to `public/` directory
   - Update `getTokenMetadata()` to return the image path for that token type

## Token Logo Sources

- **USDC**: Uses `/usd-coin-usdc-logo.png` from `public/` directory
- **BLING**: Uses emoji from `tokens.json` (✨)
- **STABLECOIN**: Uses emoji from `tokens.json` (🪙)

