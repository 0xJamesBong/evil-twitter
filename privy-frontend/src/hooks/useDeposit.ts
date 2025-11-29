import { useState } from "react";
import {
  useWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import OpinionsMarketIdl from "../lib/solana/idl/opinions_market.json";
import { OpinionsMarket as OpinionsMarketType } from "../lib/solana/types/opinions_market";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { useSolanaStore } from "../lib/stores/solanaStore";
import bs58 from "bs58";

const PROGRAM_ID = new PublicKey(
  "4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm"
);

// PDA seeds
const USER_ACCOUNT_SEED = Buffer.from("user_account");
const USER_VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("user_vault_token_account");
const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");
const VALID_PAYMENT_SEED = Buffer.from("valid_payment");

function getUserAccountPda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_ACCOUNT_SEED, user.toBuffer()],
    PROGRAM_ID
  );
}

function getUserVaultTokenAccountPda(
  user: PublicKey,
  tokenMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_VAULT_TOKEN_ACCOUNT_SEED, user.toBuffer(), tokenMint.toBuffer()],
    PROGRAM_ID
  );
}

function getVaultAuthorityPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_AUTHORITY_SEED], PROGRAM_ID);
}

function getValidPaymentPda(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VALID_PAYMENT_SEED, tokenMint.toBuffer()],
    PROGRAM_ID
  );
}

export function useDeposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { fetchVaultBalance } = useSolanaStore();

  // Support both Privy embedded wallet and external wallets (e.g., Phantom)
  // Prefer Privy embedded wallet, but fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

  console.log("solanaWallet", solanaWallet);
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
      const userPubkey = new PublicKey(solanaWallet.address);
      const connection = getConnection();

      // Derive PDAs
      const [userAccountPda] = getUserAccountPda(userPubkey);
      const [userVaultTokenAccountPda] = getUserVaultTokenAccountPda(
        userPubkey,
        tokenMint
      );
      const [vaultAuthorityPda] = getVaultAuthorityPda();
      const [validPaymentPda] = getValidPaymentPda(tokenMint);

      // Get user's token ATA (source)
      const userTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        userPubkey
      );

      // Convert amount to lamports (assuming 9 decimals)
      const amountInLamports = BigInt(Math.floor(amount * 1_000_000_000));

      // // Create a minimal wallet for Anchor (not used for signing)
      // const dummyWallet = {
      //   publicKey: userPubkey,
      //   signTransaction: async (tx: any) => tx,
      //   signAllTransactions: async (txs: any[]) => txs,
      // };

      // Create Anchor provider and program
      const provider = new anchor.AnchorProvider(
        connection,
        solanaWallet as any,
        { commitment: "confirmed" }
      );
      anchor.setProvider(provider);
      const program = new anchor.Program(
        OpinionsMarketIdl as OpinionsMarketType,
        provider
      ) as anchor.Program<OpinionsMarketType>;

      // Build deposit instruction using Anchor
      const depositIx = await program.methods
        .deposit(new anchor.BN(amountInLamports.toString()))
        .accountsPartial({
          user: userPubkey,
          payer: solanaWallet.address,
          userAccount: userAccountPda,
          tokenMint: tokenMint,
          validPayment: validPaymentPda,
          userTokenAta: userTokenAta,
          vaultAuthority: vaultAuthorityPda,
          userVaultTokenAccount: userVaultTokenAccountPda,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();

      // Build a versioned transaction with the user's wallet as fee payer
      const latestBlockhash = await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: userPubkey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [depositIx],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      // Serialize the transaction to Uint8Array for Privy
      const serializedTransaction = transaction.serialize();

      // Send the transaction using Privy (wallet will sign + send)
      const result = await signAndSendTransaction({
        transaction: serializedTransaction,
        wallet: solanaWallet,
      });

      // Convert signature from Uint8Array to base58 string
      const signature =
        typeof result.signature === "string"
          ? result.signature
          : bs58.encode(result.signature);
      console.log("Deposit transaction sent:", signature);

      // Refresh balance after a short delay
      setTimeout(() => {
        fetchVaultBalance(userPubkey, tokenMint);
      }, 2000);

      return signature;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to deposit";
      console.error("Deposit error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { deposit, loading, error };
}
