import { Keypair, PublicKey } from "@solana/web3.js";

/**
 * Generate a new ephemeral Ed25519 keypair for session delegation
 */
export function generateSessionKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Format the session message that users will sign
 * Format: "SESSION:{sessionKeyPubkey}"
 */
export function formatSessionMessage(sessionKeyPubkey: string): string {
  return `SESSION:${sessionKeyPubkey}`;
}

/**
 * Verify that a message matches the expected session format
 */
export function isValidSessionMessage(message: string, sessionKeyPubkey: string): boolean {
  const expected = formatSessionMessage(sessionKeyPubkey);
  return message === expected;
}

