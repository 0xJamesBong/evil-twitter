"use client";
import { useState } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { API_BASE_URL } from "../lib/config";

/**
 * Hook to delegate session signing authority to backend
 * Flow:
 * 1. Generate session delegation message with session pubkey and expiration
 * 2. User signs the message ONCE using Privy's signMessage
 * 3. Send signed message + metadata to backend dummy endpoint
 * Result: Establishes foundation for session-key model where backend signs all future transactions
 */
export function useDelegateSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();

  const delegateSession = async (
    sessionPubkey: string,
    expiresAt: number
  ): Promise<{ success: boolean; message: string }> => {
    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) throw new Error("No Solana wallet connected");

    setLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(solanaWallet.address);

      // Step 1: Generate delegation message
      const message = `Authorize delegate session key ${sessionPubkey} until ${expiresAt}`;
      const messageBytes = new TextEncoder().encode(message);

      // Step 2: User signs the message ONCE
      const signResult = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
        options: {
          uiOptions: {
            title: "Authorize Session Key",
            description:
              "This authorizes the backend to sign transactions on your behalf using a session key.",
          },
        },
      });

      // Step 3: Encode signature to base64
      const signatureBase64 = Buffer.from(signResult.signature).toString(
        "base64"
      );

      // Step 4: Send to backend dummy endpoint
      const response = await fetch(`${API_BASE_URL}/api/session/delegate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: userPubkey.toBase58(),
          signature: signatureBase64,
          session_pubkey: sessionPubkey,
          expires: expiresAt,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const result = await response.json();

      return result;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delegate session";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { delegateSession, loading, error };
}
