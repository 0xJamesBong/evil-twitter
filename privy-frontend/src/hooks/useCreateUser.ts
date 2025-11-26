import { useState } from "react";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { getUserAccountPda, getConfigPda } from "../lib/solana/pda";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "../lib/solana/idl/opinions_market.json";
import { PROGRAM_ID } from "../lib/solana/program";
import { SystemProgram } from "@solana/web3.js";
import { useSolanaStore } from "../lib/stores/solanaStore";

/**
 * Hook to create on-chain user account (user-signed)
 * This calls the Solana program directly and requires the user to sign the transaction
 * User must sign because the program requires user: Signer<'info>
 */
export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { fetchOnchainAccountStatus } = useSolanaStore();

  // Support both Privy embedded wallet and external wallets (e.g., Phantom)
  // Prefer Privy embedded wallet, but fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

  const createUser = async (): Promise<string> => {
    if (!solanaWallet) {
      throw new Error("No Solana wallet connected");
    }

    setLoading(true);
    setError(null);

    try {
      const connection = getConnection();
      const userPubkey = new PublicKey(solanaWallet.address);

      // Derive PDAs
      const [userAccountPda] = getUserAccountPda(PROGRAM_ID, userPubkey);
      const [configPda] = getConfigPda(PROGRAM_ID);

      // Create a minimal wallet adapter for Anchor to build the instruction
      // We won't use this for signing - Privy will sign instead
      // Note: payer is required by Wallet type but won't be used for signing
      const dummyWallet = {
        publicKey: userPubkey,
        signTransaction: async <T extends Transaction | any>(
          tx: T
        ): Promise<T> => tx,
        signAllTransactions: async <T extends Transaction | any>(
          txs: T[]
        ): Promise<T[]> => txs,
      } as Wallet;

      const provider = new AnchorProvider(connection, dummyWallet, {
        commitment: "confirmed",
      });

      const program = new (Program as any)(idl, PROGRAM_ID, provider);

      // Build the transaction (unsigned)
      const tx = await (program.methods as any)
        .createUser()
        .accounts({
          user: userPubkey,
          payer: userPubkey,
          userAccount: userAccountPda,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Sign the transaction using Privy's hook
      const signedTx = await signTransaction({
        transaction: tx,
        wallet: solanaWallet,
      });

      // Send the signed transaction
      // Note: signedTx may be a Transaction or SignTransactionOutput
      const txToSend = (signedTx as any).transaction || signedTx;
      const signature = await connection.sendRawTransaction(
        txToSend.serialize(),
        {
          skipPreflight: false,
        }
      );

      await connection.confirmTransaction(signature, "confirmed");

      // Update store after successful transaction
      await fetchOnchainAccountStatus(userPubkey);

      return signature;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createUser,
    loading,
    error,
  };
}
