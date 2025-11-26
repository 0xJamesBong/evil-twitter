import { useState } from "react";
import {
  useSolanaWallets,
  useSignTransaction as useSignTransactionSolana,
} from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { getUserAccountPda, getConfigPda } from "../lib/solana/pda";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "../lib/solana/idl/opinions_market.json";
import { PROGRAM_ID } from "../lib/solana/program";
import { SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useWallets } from "@privy-io/react-auth";

/**
 * Hook to create on-chain user account (user-signed)
 * This calls the Solana program directly and requires the user to sign the transaction
 * User must sign because the program requires user: Signer<'info>
 */
export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();
  const { signTransaction: signTransactionSolana } = useSignTransactionSolana();

  // Support both Privy embedded wallet and external wallets (e.g., Phantom)
  // Prefer Privy embedded wallet, but fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w) => w.walletClientType === "privy") || wallets[0];

  const { wallets: allWallets } = useWallets();
  //   console.log("createUser | allWallets", allWallets);

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
      const signedTx = await signTransactionSolana({
        transaction: tx,
        connection: connection,
        address: solanaWallet.address,
      });

      // Send the signed transaction
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
        }
      );

      await connection.confirmTransaction(signature, "confirmed");

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
