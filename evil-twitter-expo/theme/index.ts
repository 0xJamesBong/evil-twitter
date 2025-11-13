/**
 * Evil Twitter Design System
 *
 * Single source of truth for colors, spacing, typography, and other design tokens.
 * All components should use these tokens instead of hardcoded values.
 */

// ============================================================================
// Colors
// ============================================================================

export const colors = {
  // Backgrounds
  bg: "#000000",
  bgElevated: "#0b0b0b",
  bgSubtle: "#0f0f0f",
  bgHover: "#1a1a1a",
  bgCard: "#16181c", // Card backgrounds
  bgCardSecondary: "#2a2a2a", // Secondary card backgrounds

  // Borders
  border: "#2f3336",
  borderSubtle: "rgba(255, 255, 255, 0.08)",
  borderStrong: "#536471",

  // Text
  textPrimary: "#f5f5f5",
  textSecondary: "#9ca3af",
  textTertiary: "#6b6e72",
  textInverse: "#000000",

  // Accent colors
  accent: "#1DA1F2", // Twitter blue
  accentHover: "#1a8cd8",
  accentActive: "#0d7bc4",

  // Semantic colors
  success: "#22c55e",
  danger: "#f97373",
  dangerStrong: "#f4212e", // Stronger red for errors
  warning: "#fbbf24",
  info: "#3b82f6",

  // Special token colors
  blingBg: "#3a2a4a", // BLING token background
  blingBorder: "#9d4edd", // BLING token border

  // Energy system colors
  energyBg: "#11161c", // Energy container background
  energySupport: "#81c995", // Support/gain color
  energyAttack: "#f28b82", // Attack/loss color
  likeActive: "#f91880", // Active like color (pink)

  // Special
  overlay: "rgba(0, 0, 0, 0.6)",
  overlayStrong: "rgba(0, 0, 0, 0.7)",
} as const;

// ============================================================================
// Spacing
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  "4xl": 64,
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 999,
  full: 9999,
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: "600" as const,
    lineHeight: 20,
  },

  // Small text
  caption: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
  smallBold: {
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 16,
  },
} as const;

// ============================================================================
// Shadows (for web/elevation)
// ============================================================================

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// ============================================================================
// Breakpoints (for responsive design)
// ============================================================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1200,
  "2xl": 1400,
} as const;

// ============================================================================
// Z-Index Scale
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radii;
export type TypographyVariant = keyof typeof typography;
export type BreakpointKey = keyof typeof breakpoints;
