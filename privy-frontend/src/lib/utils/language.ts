/**
 * Language and font utilities
 * Centralized utilities for handling language preferences and font families
 */

import { Language } from "@/lib/graphql/types";

/**
 * Font family mapping for each language/script rendering mode
 */
export const LANGUAGE_FONT_FAMILY: Record<Language, string | null> = {
  [Language.CANTONESE]: 'var(--font-jyutcitzi), Arial, Helvetica, sans-serif',
  [Language.GOETSUAN]: 'var(--font-goetsusioji), Arial, Helvetica, sans-serif',
  [Language.NONE]: null,
};

/**
 * Convert a language string (from GraphQL/backend) to Language enum
 * Handles both PascalCase ("Cantonese", "Goetsuan", "None") and SCREAMING_SNAKE_CASE ("CANTONESE", "GOETSUAN", "NONE")
 * 
 * @param languageStr - Language string from backend/GraphQL
 * @returns Language enum value, defaults to NONE if invalid
 */
export function parseLanguage(languageStr: string | null | undefined): Language {
  if (!languageStr) return Language.NONE;
  
  const normalized = languageStr.toUpperCase();
  if (normalized === 'CANTONESE') return Language.CANTONESE;
  if (normalized === 'GOETSUAN') return Language.GOETSUAN;
  return Language.NONE;
}

/**
 * Get font family for a given language
 * 
 * @param language - Language enum value
 * @returns Font family CSS string or null for NONE
 */
export function getFontFamilyForLanguage(language: Language): string | null {
  return LANGUAGE_FONT_FAMILY[language] ?? null;
}

/**
 * Get font family for a language string (convenience function)
 * Combines parseLanguage and getFontFamilyForLanguage
 * 
 * @param languageStr - Language string from backend/GraphQL
 * @returns Font family CSS string or null for NONE
 */
export function getFontFamilyForLanguageString(languageStr: string | null | undefined): string | null {
  const language = parseLanguage(languageStr);
  return getFontFamilyForLanguage(language);
}

