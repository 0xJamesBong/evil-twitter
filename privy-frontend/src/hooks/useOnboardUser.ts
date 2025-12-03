"use client";

import { useState } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import { useIdentityToken } from "@privy-io/react-auth";
import bs58 from "bs58";
import {
  ONBOARD_USER_MUTATION,
  OnboardUserResult,
  SESSION_MESSAGE_QUERY,
} from "@/lib/graphql/users/mutations";
import { graphqlRequest } from "@/lib/graphql/client";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useSolanaStore } from "@/lib/stores/solanaStore";

/**
 * Hook to onboard a new user with session registration
 * Flow:
 * 1. Generate ephemeral session keypair
 * 2. Create message: SESSION:{session_key}
 * 3. Prompt user to sign message with their wallet
 * 4. Call onboardUser GraphQL mutation with handle, displayName, and session data
 * 5. Backend creates user, ensures on-chain user exists, and registers session
 */
export function useOnboardUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { identityToken } = useIdentityToken();
  const { setSession, fetchMe } = useBackendUserStore();
  const { fetchOnchainAccountStatus } = useSolanaStore();

  const onboardUser = async (
    handle: string,
    displayName: string
  ): Promise<OnboardUserResult["onboardUser"]> => {
    console.log("📝 useOnboardUser: Starting onboard flow");
    console.log("   Handle:", handle, "DisplayName:", displayName);

    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) {
      console.error("❌ useOnboardUser: No Solana wallet connected");
      throw new Error("No Solana wallet connected");
    }

    console.log("✅ useOnboardUser: Found wallet:", solanaWallet.address);

    setLoading(true);
    setError(null);

    try {
      // Step 1: Check for identity token
      if (!identityToken) {
        throw new Error("No identity token available. Please log in.");
      }

      // Step 2: Get complete message bytes from backend (ready to sign)
      console.log(
        "🔑 useOnboardUser: Fetching session message from backend..."
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
        "✅ useOnboardUser: Got message bytes from backend, length:",
        messageBytes.length
      );

      // Step 3: Prompt user to sign message with their wallet
      console.log("✍️  useOnboardUser: Requesting signature from user...");
      const signatureResult = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
        options: {
          uiOptions: {
            title: "Onboard Account",
            description:
              "Sign this message to create your account and register a session key for 30 days",
          },
        },
      });

      // Step 4: Encode signature to base58
      const signatureBytes = signatureResult.signature;
      const signatureBase58 = bs58.encode(signatureBytes);
      console.log(
        "✅ useOnboardUser: Message signed, signature:",
        signatureBase58.slice(0, 20) + "..."
      );

      // Step 5: Call GraphQL onboardUser mutation (only send signature, backend has session key)
      console.log("📤 useOnboardUser: Calling GraphQL onboardUser mutation...");
      const data = await graphqlRequest<OnboardUserResult>(
        ONBOARD_USER_MUTATION,
        {
          input: {
            handle,
            displayName,
            sessionSignature: signatureBase58,
          },
        },
        identityToken
      );

      console.log("✅ useOnboardUser: User onboarded successfully!");
      console.log(
        "   User ID:",
        data.onboardUser.user.id,
        "Session PDA:",
        data.onboardUser.session?.sessionAuthorityPda
      );

      // Step 6: Store session if returned
      if (data.onboardUser.session) {
        const session = data.onboardUser.session;
        setSession(
          session.sessionAuthorityPda,
          session.sessionKey,
          session.expiresAt,
          session.userWallet
        );
        console.log("✅ useOnboardUser: Session stored in state");
      }

      // Step 7: Refresh user data and on-chain account status
      console.log("🔄 useOnboardUser: Refreshing user data...");
      await fetchMe(identityToken);

      if (solanaWallet.address) {
        const { PublicKey } = await import("@solana/web3.js");
        const userPubkey = new PublicKey(solanaWallet.address);
        await fetchOnchainAccountStatus(userPubkey);
      }

      console.log("✅ useOnboardUser: User data refreshed");

      return data.onboardUser;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to onboard user";
      console.error("❌ useOnboardUser: Error occurred:", msg);
      console.error("   Full error:", err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      console.log("🏁 useOnboardUser: Flow completed, loading set to false");
    }
  };

  return { onboardUser, loading, error };
}
