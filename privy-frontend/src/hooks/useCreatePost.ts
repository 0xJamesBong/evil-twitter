"use client";
import { useState } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { API_BASE_URL } from "../lib/config";

/**
 * Hook to create on-chain post account (backend-signed, no user signing required)
 * Flow:
 * 1. Send user wallet pubkey and post_id_hash to backend
 * 2. Backend creates and signs transaction with payer
 * 3. Backend broadcasts transaction
 * Result: Post account created without any wallet signing required
 */
export function useCreatePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();

  const createPost = async (
    postIdHash: string,
    parentPostPda?: string
  ): Promise<string> => {
    console.log("📝 useCreatePost: Starting createPost flow");

    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) {
      console.error("❌ useCreatePost: No Solana wallet connected");
      throw new Error("No Solana wallet connected");
    }

    console.log("✅ useCreatePost: Found wallet:", solanaWallet.address);
    console.log(
      "   Wallet type:",
      (solanaWallet as any).walletClientType || "unknown"
    );

    setLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      console.log("📍 useCreatePost: User pubkey:", userPubkey.toBase58());
      console.log("📍 useCreatePost: Post ID hash:", postIdHash);
      if (parentPostPda) {
        console.log("📍 useCreatePost: Parent post PDA:", parentPostPda);
      }

      const requestBody: {
        user_wallet: string;
        post_id_hash: string;
        parent_post_pda?: string;
      } = {
        user_wallet: userPubkey.toBase58(),
        post_id_hash: postIdHash,
      };

      if (parentPostPda) {
        requestBody.parent_post_pda = parentPostPda;
      }

      console.log("📤 useCreatePost: Sending request to backend:", {
        url: `${API_BASE_URL}/api/post/createPost`,
        method: "POST",
        body: requestBody,
      });

      // Call backend to create post account (backend signs and broadcasts)
      const response = await fetch(`${API_BASE_URL}/api/post/createPost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 useCreatePost: Received response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ useCreatePost: Backend error response:", errorText);
        throw new Error(`Backend error: ${errorText}`);
      }

      const { signature } = await response.json();
      console.log("✅ useCreatePost: Post account created successfully!");
      console.log("   Transaction signature:", signature);

      return signature;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create post";
      console.error("❌ useCreatePost: Error occurred:", msg);
      console.error("   Full error:", err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      console.log("🏁 useCreatePost: Flow completed, loading set to false");
    }
  };

  return { createPost, loading, error };
}

/**
 * Utility function to create post on-chain (can be called from stores)
 * @param userWallet - Base58 encoded Solana wallet address
 * @param postIdHash - Hex encoded post ID hash
 * @param parentPostPda - Optional parent post PDA (Base58 encoded)
 */
export async function createPostOnChain(
  userWallet: string,
  postIdHash: string,
  parentPostPda?: string
): Promise<string> {
  console.log("📝 createPostOnChain: Starting createPost flow");
  console.log("📍 createPostOnChain: User wallet:", userWallet);
  console.log("📍 createPostOnChain: Post ID hash:", postIdHash);
  if (parentPostPda) {
    console.log("📍 createPostOnChain: Parent post PDA:", parentPostPda);
  }

  const requestBody: {
    user_wallet: string;
    post_id_hash: string;
    parent_post_pda?: string;
  } = {
    user_wallet: userWallet,
    post_id_hash: postIdHash,
  };

  if (parentPostPda) {
    requestBody.parent_post_pda = parentPostPda;
  }

  console.log("📤 createPostOnChain: Sending request to backend:", {
    url: `${API_BASE_URL}/api/post/createPost`,
    method: "POST",
    body: requestBody,
  });

  // Call backend to create post account (backend signs and broadcasts)
  const response = await fetch(`${API_BASE_URL}/api/post/createPost`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("📥 createPostOnChain: Received response:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ createPostOnChain: Backend error response:", errorText);
    throw new Error(`Backend error: ${errorText}`);
  }

  const { signature } = await response.json();
  console.log("✅ createPostOnChain: Post account created successfully!");
  console.log("   Transaction signature:", signature);

  return signature;
}
