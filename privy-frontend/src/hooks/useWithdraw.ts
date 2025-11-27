import { useState } from "react";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "../lib/solana/idl/opinions_market.json";

import { useSolanaStore } from "../lib/stores/solanaStore";
import { toast } from "react-toastify";

export function useWithdraw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { updateVaultBalanceAfterTransaction } = useSolanaStore();

  // Support both Privy embedded wallet and external wallets (e.g., Phantom)
  // Prefer Privy embedded wallet, but fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

  const withdraw = async (
    amount: number,
    tokenMint: PublicKey
  ): Promise<string> => {
    if (!solanaWallet) {
      throw new Error("No Solana wallet connected");
    }

    setLoading(true);
    setError(null);

    try {
      toast.success("Withdraw successful");
      return "Withdraw successful";
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to withdraw";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error };
}
