import { useState } from "react";
import { useSolanaWallets } from "@privy-io/react-auth";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { getProgram } from "../lib/solana/program";
import { getUserVaultTokenAccountPda, getVaultAuthorityPda, getUserAccountPda } from "../lib/solana/pda";

const PROGRAM_ID = new PublicKey("4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm");

export function useWithdraw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();
  const solanaWallet = wallets.find((w) => w.walletClientType === "privy");

  const withdraw = async (amount: number, tokenMint: PublicKey): Promise<string> => {
    if (!solanaWallet) {
      throw new Error("No Solana wallet connected");
    }

    setLoading(true);
    setError(null);

    try {
      const connection = getConnection();
      const program = getProgram(connection, solanaWallet);

      if (!program) {
        throw new Error("Failed to initialize program");
      }

      const userPubkey = solanaWallet.publicKey!;
      
      // Derive PDAs
      const [userAccountPda] = getUserAccountPda(PROGRAM_ID, userPubkey);
      const [vaultAuthorityPda] = getVaultAuthorityPda(PROGRAM_ID);
      const [userVaultTokenAccountPda] = getUserVaultTokenAccountPda(PROGRAM_ID, userPubkey, tokenMint);

      // Get user's destination token account (ATA)
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const userTokenDestAta = await getAssociatedTokenAddress(tokenMint, userPubkey);

      // Build withdraw instruction
      // Note: This is a simplified version - full implementation requires proper Anchor types
      const tx = await program.methods
        .withdraw(amount)
        .accounts({
          user: userPubkey,
          userAccount: userAccountPda,
          tokenMint: tokenMint,
          userTokenDestAta: userTokenDestAta,
          userVaultTokenAccount: userVaultTokenAccountPda,
          vaultAuthority: vaultAuthorityPda,
          tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        })
        .transaction();

      // Sign and send transaction
      const signature = await connection.sendTransaction(tx, [solanaWallet], {
        skipPreflight: false,
      });

      await connection.confirmTransaction(signature, "confirmed");

      return signature;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to withdraw";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error };
}

