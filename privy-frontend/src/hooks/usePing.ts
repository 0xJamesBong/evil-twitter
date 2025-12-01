"use client";
import { useState } from "react";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { VersionedTransaction } from "@solana/web3.js";
import { getBackendUrl } from "../lib/config";

/**
 * Hook to ping the Solana program (user-signed, backend-payer)
 * Flow:
 * 1. Request partially-signed transaction from backend (backend signs as payer)
 * 2. User signs the transaction
 * 3. Send signed transaction back to backend for final signature and broadcast
 * Result: User can ping program without SOL, backend pays fees
 */
export function usePing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const ping = async (): Promise<string> => {
    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) throw new Error("No Solana wallet connected");

    setLoading(true);
    setError(null);

    try {
      // Step 1: Request partially-signed transaction from backend
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/tx/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      const submitResponse = await fetch(`${backendUrl}/api/tx/ping/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transaction: signedTxBase64 }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`Backend submit error: ${errorText}`);
      }

      const { signature } = await submitResponse.json();

      return signature;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to ping";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { ping, loading, error };
}
