// Theme configuration for the application
// This file contains all the color definitions and theme variables

export const colors = {
  // Base colors
  primary: {
    DEFAULT: "#3b82f6", // blue-500
    light: "#60a5fa", // blue-400
    dark: "#2563eb", // blue-600
  },
  secondary: {
    DEFAULT: "#8b5cf6", // purple-500
    light: "#a78bfa", // purple-400
    dark: "#7c3aed", // purple-600
  },
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  error: "#ef4444", // red-500
  info: "#06b6d4", // cyan-500

  // Grayscale
  black: "#000000",
  white: "#ffffff",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },

  // UI specific colors
  background: {
    primary: "#000000", // black
    secondary: "#111827", // gray-900
    tertiary: "#1f2937", // gray-800
  },
  text: {
    primary: "#ffffff", // white
    secondary: "#9ca3af", // gray-400
    tertiary: "#6b7280", // gray-500
  },
  border: {
    light: "#374151", // gray-700
    DEFAULT: "#1f2937", // gray-800
    dark: "#111827", // gray-900
  },

  // Social colors
  social: {
    like: "#f43f5e", // red-500
  },
};

export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
};

export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  "3xl": "1.5rem", // 24px
  full: "9999px",
};

export const fontSize = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  lg: "1.125rem", // 18px
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem", // 36px
};

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

// Default theme object that combines all theme properties
export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

export default theme;
