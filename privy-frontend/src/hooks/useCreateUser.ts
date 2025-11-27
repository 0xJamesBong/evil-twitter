"use client";
import { useState } from "react";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useSolanaStore } from "../lib/stores/solanaStore";
import { API_BASE_URL } from "../lib/config";

/**
 * Hook to create on-chain user account (user-signed, backend-payer)
 * Flow:
 * 1. Request partially-signed transaction from backend (backend signs as payer)
 * 2. User signs the transaction (as user authority)
 * 3. Send signed transaction back to backend for final signature and broadcast
 * Result: User can create account without SOL, backend pays fees
 */
export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { fetchOnchainAccountStatus } = useSolanaStore();

  const createUser = async (): Promise<string> => {
    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) throw new Error("No Solana wallet connected");

    setLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(solanaWallet.address);

      // Step 1: Request partially-signed transaction from backend
      const response = await fetch(`${API_BASE_URL}/api/tx/createUser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_pubkey: userPubkey.toBase58(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const { transaction: base64Tx } = await response.json();

      // Step 2: Deserialize partially-signed VersionedTransaction
      const txBuffer = Buffer.from(base64Tx, "base64");
      const tx = VersionedTransaction.deserialize(txBuffer);

      // Step 3: User signs the transaction using Privy's hook
      const signedTxResult = await signTransaction({
        transaction: tx as any,
        wallet: solanaWallet,
      });

      // Extract the signed transaction from the result
      const signedTx = (signedTxResult as any).transaction || signedTxResult;

      // Step 4: Serialize signed transaction and send to backend for final signature and broadcast
      const signedTxBase64 = Buffer.from(signedTx.serialize()).toString(
        "base64"
      );

      const submitResponse = await fetch(
        `${API_BASE_URL}/api/tx/createUser/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transaction: signedTxBase64 }),
        }
      );

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`Backend submit error: ${errorText}`);
      }

      const { signature } = await submitResponse.json();

      // Step 5: Update store
      await fetchOnchainAccountStatus(userPubkey);

      return signature;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error };
}
