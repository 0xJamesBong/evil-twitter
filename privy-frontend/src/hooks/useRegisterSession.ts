"use client";

import { useState } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { PublicKey, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  REGISTER_SESSION_MUTATION,
  RegisterSessionResult,
} from "@/lib/graphql/users/mutations";
import { graphqlRequest } from "@/lib/graphql/client";
import { usePrivy } from "@privy-io/react-auth";

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
  const { getAccessToken } = usePrivy();

  const registerSession = async (): Promise<SessionData> => {
    console.log("📝 useRegisterSession: Starting session registration");

    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) {
      console.error("❌ useRegisterSession: No Solana wallet connected");
      throw new Error("No Solana wallet connected");
    }

    console.log("✅ useRegisterSession: Found wallet:", solanaWallet.address);

    setLoading(true);
    setError(null);

    try {
      // Step 1: Generate ephemeral session key
      const sessionKeypair = Keypair.generate();
      const sessionKey = sessionKeypair.publicKey.toBase58();
      console.log("🔑 useRegisterSession: Generated session key:", sessionKey);

      // Step 2: Create message to sign
      const message = `SESSION:${sessionKey}`;
      const messageBytes = new TextEncoder().encode(message);
      console.log("📝 useRegisterSession: Message to sign:", message);

      // Step 3: Sign message with user's wallet
      console.log("✍️  useRegisterSession: Requesting signature from user...");
      const signatureResult = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
        options: {
          uiOptions: {
            title: "Register Session Key",
            description:
              "Sign this message to register a session key for 30 days",
          },
        },
      });

      // Step 4: Encode signature to base58
      const signatureBytes = signatureResult.signature;
      const signatureBase58 = bs58.encode(signatureBytes);
      console.log(
        "✅ useRegisterSession: Message signed, signature:",
        signatureBase58.slice(0, 20) + "..."
      );

      // Step 5: Get access token for GraphQL request
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error("Failed to get access token");
      }

      // Step 6: Call GraphQL registerSession mutation
      console.log(
        "📤 useRegisterSession: Calling GraphQL registerSession mutation..."
      );
      const data = await graphqlRequest<RegisterSessionResult>(
        REGISTER_SESSION_MUTATION,
        {
          input: {
            sessionPubkey: sessionKey,
            sessionMessage: message,
            sessionSignature: signatureBase58,
          },
        },
        accessToken
      );

      console.log("✅ useRegisterSession: Session registered successfully!");
      console.log(
        "   Session Authority PDA:",
        data.registerSession.session.sessionAuthorityPda
      );

      const sessionData: SessionData = {
        sessionAuthorityPda: data.registerSession.session.sessionAuthorityPda,
        sessionKey: data.registerSession.session.sessionKey,
        expiresAt: data.registerSession.session.expiresAt,
        userWallet: data.registerSession.session.userWallet,
      };

      return sessionData;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to register session";
      console.error("❌ useRegisterSession: Error occurred:", msg);
      console.error("   Full error:", err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      console.log(
        "🏁 useRegisterSession: Flow completed, loading set to false"
      );
    }
  };

  return { registerSession, loading, error };
}
