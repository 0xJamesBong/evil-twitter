import { useState } from "react";
import {
  useSolanaWallets,
  useSignTransaction as useSignTransactionSolana,
} from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import {
  getUserVaultTokenAccountPda,
  getVaultAuthorityPda,
  getUserAccountPda,
  getValidPaymentPda,
} from "../lib/solana/pda";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "../lib/solana/idl/opinions_market.json";
import { PROGRAM_ID } from "../lib/solana/program";

export function useDeposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();
  const { signTransaction: signTransactionSolana } = useSignTransactionSolana();

  // Support both Privy embedded wallet and external wallets (e.g., Phantom)
  // Prefer Privy embedded wallet, but fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w) => w.walletClientType === "privy") || wallets[0];

  const deposit = async (
    amount: number,
    tokenMint: PublicKey
  ): Promise<string> => {
    if (!solanaWallet) {
      throw new Error("No Solana wallet connected");
    }

    setLoading(true);
    setError(null);

    try {
      const connection = getConnection();
      const userPubkey = new PublicKey(solanaWallet.address);

      // Create a minimal wallet adapter for Anchor to build the instruction
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

      // Derive PDAs
      const [userAccountPda] = getUserAccountPda(PROGRAM_ID, userPubkey);
      const [vaultAuthorityPda] = getVaultAuthorityPda(PROGRAM_ID);
      const [userVaultTokenAccountPda] = getUserVaultTokenAccountPda(
        PROGRAM_ID,
        userPubkey,
        tokenMint
      );
      const [validPaymentPda] = getValidPaymentPda(PROGRAM_ID, tokenMint);

      // Get user's token account (ATA)
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const userTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        userPubkey
      );

      // Build deposit instruction (unsigned)
      const tx = await program.methods
        .deposit(amount)
        .accounts({
          user: userPubkey,
          userAccount: userAccountPda,
          tokenMint: tokenMint,
          validPayment: validPaymentPda,
          userTokenAta: userTokenAta,
          vaultAuthority: vaultAuthorityPda,
          userVaultTokenAccount: userVaultTokenAccountPda,
          tokenProgram: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
          systemProgram: new PublicKey("11111111111111111111111111111111"),
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
        err instanceof Error ? err.message : "Failed to deposit";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { deposit, loading, error };
}
