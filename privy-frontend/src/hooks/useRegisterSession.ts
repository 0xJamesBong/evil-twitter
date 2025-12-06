"use client";

import { useState } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { useIdentityToken } from "@privy-io/react-auth";
import bs58 from "bs58";
import {
  RENEW_SESSION_MUTATION,
  RenewSessionResult,
  SESSION_MESSAGE_QUERY,
} from "@/lib/graphql/users/mutations";
import { graphqlRequest } from "@/lib/graphql/client";

export interface SessionData {
  sessionAuthorityPda: string;
  sessionKey: string;
  expiresAt: number;
  userWallet: string;
}

export function useRenewSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { identityToken } = useIdentityToken();

  const renewSession = async (): Promise<SessionData> => {
    console.log("📝 useRenewSession: Starting session renewal");

    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) {
      console.error("❌ useRenewSession: No Solana wallet connected");
      throw new Error("No Solana wallet connected");
    }

    console.log("✅ useRenewSession: Found wallet:", solanaWallet.address);

    setLoading(true);
    setError(null);

    try {
      // Step 1: Check for identity token
      if (!identityToken) {
        throw new Error("No identity token available. Please log in.");
      }

      // Step 2: Get complete message bytes from backend (ready to sign)
      console.log(
        "🔑 useRenewSession: Fetching session message from backend..."
      );
      const sessionMessageData = await graphqlRequest<{
        sessionMessage: string;
      }>(SESSION_MESSAGE_QUERY, undefined, identityToken);
      // Decode base64 message bytes (backend returns base64-encoded message)
      const base64Message = sessionMessageData.sessionMessage;
      const binaryString = atob(base64Message);
      const messageBytes = Uint8Array.from(binaryString, (char) =>
        char.charCodeAt(0)
      );
      console.log(
        "✅ useRenewSession: Got message bytes from backend, length:",
        messageBytes.length
      );

      // Step 3: Sign message with user's wallet
      console.log("✍️  useRenewSession: Requesting signature from user...");
      const signatureResult = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
        options: {
          uiOptions: {
            title: "Renew Session Key",
            description:
              "Sign this message to renew your session key for 30 days",
          },
        },
      });

      // Step 4: Encode signature to base58
      const signatureBytes = signatureResult.signature;
      const signatureBase58 = bs58.encode(signatureBytes);
      console.log(
        "✅ useRenewSession: Message signed, signature:",
        signatureBase58.slice(0, 20) + "..."
      );

      // Step 5: Call GraphQL renewSession mutation (only send signature, backend has session key)
      console.log(
        "📤 useRenewSession: Calling GraphQL renewSession mutation..."
      );
      const data = await graphqlRequest<RenewSessionResult>(
        RENEW_SESSION_MUTATION,
        {
          input: {
            sessionSignature: signatureBase58,
          },
        },
        identityToken
      );

      console.log("✅ useRenewSession: Session renewed successfully!");
      console.log(
        "   Session Authority PDA:",
        data.renewSession.session.sessionAuthorityPda
      );

      const sessionData: SessionData = {
        sessionAuthorityPda: data.renewSession.session.sessionAuthorityPda,
        sessionKey: data.renewSession.session.sessionKey,
        expiresAt: data.renewSession.session.expiresAt,
        userWallet: data.renewSession.session.userWallet,
      };

      return sessionData;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to renew session";
      console.error("❌ useRenewSession: Error occurred:", msg);
      console.error("   Full error:", err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      console.log("🏁 useRenewSession: Flow completed, loading set to false");
    }
  };

  return { renewSession, loading, error };
}
