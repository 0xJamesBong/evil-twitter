"use client";
import { useState } from "react";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { Transaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { API_BASE_URL } from "../lib/config";

/**
 * Hook to ping the Solana program (user-signed, backend-payer)
 * Flow:
 * 1. Request partially-signed transaction from backend (backend signs as payer)
 * 2. User signs the transaction
 * 3. Send fully-signed transaction to chain
 * Result: User can ping program without SOL, backend pays fees
 */
export function usePing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const ping = async (): Promise<string> => {
    const connection = getConnection();
    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) throw new Error("No Solana wallet connected");

    setLoading(true);
    setError(null);

    try {
      // Step 1: Request partially-signed transaction from backend
      const response = await fetch(`${API_BASE_URL}/api/tx/ping`, {
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

      // Step 2: Deserialize partially-signed transaction
      const txBuffer = Buffer.from(base64Tx, "base64");
      const tx = Transaction.from(txBuffer);

      // Step 3: User signs the transaction using Privy's hook
      // Note: The transaction from backend is already partially signed by backend payer
      // We just need to add the user's signature
      // Type assertion needed because Privy's types expect specific transaction format
      const signedTxResult = await signTransaction({
        transaction: tx as any,
        wallet: solanaWallet,
      });

      // Extract the signed transaction from the result
      // Note: signedTx may be a Transaction or SignTransactionOutput
      const signedTx = (signedTxResult as any).transaction || signedTxResult;

      // Step 4: Send fully-signed transaction to chain
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
        }
      );

      // Step 5: Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

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
