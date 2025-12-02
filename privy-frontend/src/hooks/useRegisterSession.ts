"use client";
import { useState } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { getBackendUrl } from "../lib/config";
import {
  generateSessionKeypair,
  formatSessionMessage,
} from "../lib/solana/session";

export interface SessionData {
  sessionAuthorityPda: string;
  sessionKey: string;
  expiresAt: number;
  userWallet: string;
}

export function useRegisterSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();

  const registerSession = async (): Promise<SessionData> => {
    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) {
      throw new Error("No Solana wallet connected");
    }

    setLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(solanaWallet.address);

      // Step 1: Generate ephemeral session keypair
      const sessionKey = generateSessionKeypair();
      const sessionKeyPubkey = sessionKey.publicKey.toBase58();

      // Step 2: Format message
      const message = formatSessionMessage(sessionKeyPubkey);
      const messageBytes = new TextEncoder().encode(message);

      // Step 3: User signs the message using Privy
      const signResult = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
        options: {
          uiOptions: {
            title: "Register Session Key",
            description:
              "This authorizes a session key to act on your behalf for 30 days. You'll only need to sign once.",
          },
        },
      });

      // Step 4: Encode signature to base58
      const signatureBase58 = bs58.encode(signResult.signature);

      // Step 5: Send to backend
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/session/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_wallet: userPubkey.toBase58(),
          session_key: sessionKeyPubkey,
          signature: signatureBase58,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const result = await response.json();

      const sessionData: SessionData = {
        sessionAuthorityPda: result.session_authority_pda,
        sessionKey: sessionKeyPubkey,
        expiresAt: result.expires_at,
        userWallet: userPubkey.toBase58(),
      };

      return sessionData;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to register session";
      console.error("Register session error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { registerSession, loading, error };
}

