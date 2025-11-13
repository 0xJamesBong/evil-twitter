/**
 * @deprecated This file is kept for backward compatibility.
 *
 * New code should use the design system from '@/theme' instead.
 *
 * @see STYLING.md for the new styling system documentation.
 */

import { Platform } from "react-native";
import { colors } from "@/theme";

// Legacy Colors export for backward compatibility
export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.bg,
    tint: colors.accent,
    icon: colors.textSecondary,
    tabIconDefault: colors.textTertiary,
    tabIconSelected: colors.accent,
  },
  dark: {
    text: colors.textPrimary,
    background: colors.bg,
    tint: colors.accent,
    icon: colors.textSecondary,
    tabIconDefault: colors.textTertiary,
    tabIconSelected: colors.accent,
  },
};

// Legacy Fonts export
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
