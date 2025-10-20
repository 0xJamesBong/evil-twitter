/**
 * Centralized API configuration
 * This is the single source of truth for the API base URL
 */

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
