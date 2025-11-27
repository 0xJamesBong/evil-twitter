"use client";
import { useState } from "react";
import {
  useWallets,
  useSignTransaction,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { getUserAccountPda, getConfigPda } from "../lib/solana/pda";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "../lib/solana/idl/opinions_market.json";
import { PROGRAM_ID } from "../lib/solana/program";
import { SystemProgram } from "@solana/web3.js";
import { useSolanaStore } from "../lib/stores/solanaStore";
import { useSendTransaction } from "@privy-io/react-auth";
import { createSolanaRpc } from "@solana/kit";
import { useSolanaProgram } from "@/lib/solana/solanaProgramContext";

/**
 * Hook to create on-chain user account (user-signed)
 * This calls the Solana program directly and requires the user to sign the transaction
 * User must sign because the program requires user: Signer<'info>
 */

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { wallets } = useWallets();
  const { getProgramForWallet, connection } = useSolanaProgram();

  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signTransaction } = useSignTransaction();
  const { fetchOnchainAccountStatus } = useSolanaStore();

  const createUser = async (): Promise<string> => {
    const connection = getConnection();

    const solanaWallet =
      wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    if (!solanaWallet) throw new Error("No Solana wallet connected");
    console.log("useCreateUser | solanaWallet", solanaWallet);

    setLoading(true);
    setError(null);

    try {
      console.log("trying: useCreateUser");
      const userPubkey = new PublicKey(solanaWallet.address);

      const [userAccountPda] = getUserAccountPda(PROGRAM_ID, userPubkey);
      const [configPda] = getConfigPda(PROGRAM_ID);
      const program = getProgramForWallet(solanaWallet);

      console.log("useCreateUser | userPubkey", userPubkey);
      console.log("useCreateUser | connection", connection);
      console.log("useCreateUser | PROGRAM_ID", PROGRAM_ID.toBase58());

      const { getLatestBlockhash } = createSolanaRpc("http://localhost:8899");

      // Get the latest blockhash
      const { value } = await getLatestBlockhash().send();

      console.log("useCreateUser | userAccountPda", userAccountPda);
      console.log("useCreateUser | configPda", configPda);
      console.log("useCreateUser | program", program);

      const ix = await program.methods
        .createUser()
        .accounts({
          user: userPubkey,
          payer: userPubkey,
          userAccount: userAccountPda,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const latest = await connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: userPubkey,
        recentBlockhash: latest.blockhash,
      }).add(ix);

      console.log("useCreateUser | wallet", solanaWallet);

      // if (solanaWallet.walletClientType === "privy") {
      //   // Embedded wallet path
      //   signature = await signAndSendTransaction({
      //     transaction: tx,
      //     wallet: solanaWallet,
      //   });
      // } else {
      // Phantom / Backpack / External
      const signature = await solanaWallet.signAndSendTransaction!({
        chain: "solana:devnet",
        transaction: new Uint8Array(
          tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
        ),
      });

      // await connection.confirmTransaction(signature, "confirmed");
      await fetchOnchainAccountStatus(userPubkey);
      return Buffer.from(signature.signature).toString("base64");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      console.log("useCreateUser | error", err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error };
}
