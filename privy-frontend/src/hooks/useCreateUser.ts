"use client";
import { useState } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { useSolanaStore } from "../lib/stores/solanaStore";
import { getBackendUrl } from "../lib/config";

/**
 * Hook to create on-chain user account (backend-signed, no user signing required)
 * Flow:
 * 1. Send user wallet pubkey to backend
 * 2. Backend creates and signs transaction with payer
 * 3. Backend broadcasts transaction
 * Result: User account created without any wallet signing required
 */
export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { fetchOnchainAccountStatus } = useSolanaStore();

  const createUser = async (): Promise<string> => {
    console.log("📝 useCreateUser: Starting createUser flow");

    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) {
      console.error("❌ useCreateUser: No Solana wallet connected");
      throw new Error("No Solana wallet connected");
    }

    console.log("✅ useCreateUser: Found wallet:", solanaWallet.address);
    console.log(
      "   Wallet type:",
      (solanaWallet as any).walletClientType || "unknown"
    );

    setLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      console.log("📍 useCreateUser: User pubkey:", userPubkey.toBase58());

      const requestBody = {
        user_wallet: userPubkey.toBase58(),
      };
      const backendUrl = getBackendUrl();
      console.log("📤 useCreateUser: Sending request to backend:", {
        url: `${backendUrl}/api/user/createUser`,
        method: "POST",
        body: requestBody,
      });

      // Call backend to create user account (backend signs and broadcasts)
      const response = await fetch(`${backendUrl}/api/user/createUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 useCreateUser: Received response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ useCreateUser: Backend error response:", errorText);
        throw new Error(`Backend error: ${errorText}`);
      }

      const { signature } = await response.json();
      console.log("✅ useCreateUser: User account created successfully!");
      console.log("   Transaction signature:", signature);

      // Update store
      console.log("🔄 useCreateUser: Updating on-chain account status...");
      await fetchOnchainAccountStatus(userPubkey);
      console.log("✅ useCreateUser: Account status updated");

      return signature;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      console.error("❌ useCreateUser: Error occurred:", msg);
      console.error("   Full error:", err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      console.log("🏁 useCreateUser: Flow completed, loading set to false");
    }
  };

  return { createUser, loading, error };
}
