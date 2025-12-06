import { useState } from "react";
import {
  useWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import { useSolanaStore } from "../lib/stores/solanaStore";
import bs58 from "bs58";
import { getProgramId, getIdl } from "../lib/solana/config";

// PDA seeds
const USER_ACCOUNT_SEED = Buffer.from("user_account");
const USER_VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("user_vault_token_account");
const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");
const VALID_PAYMENT_SEED = Buffer.from("valid_payment");

function getUserAccountPda(
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_ACCOUNT_SEED, user.toBuffer()],
    programId
  );
}

function getUserVaultTokenAccountPda(
  user: PublicKey,
  tokenMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_VAULT_TOKEN_ACCOUNT_SEED, user.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}

function getVaultAuthorityPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_AUTHORITY_SEED], programId);
}

function getValidPaymentPda(
  tokenMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VALID_PAYMENT_SEED, tokenMint.toBuffer()],
    programId
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
    tokenMint: PublicKey,
    tokenDecimals?: number // Optional: if provided, use this instead of fetching
  ): Promise<string> => {
    if (!solanaWallet) {
      throw new Error("No Solana wallet connected");
    }

    setLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(solanaWallet.address);
      const connection = getConnection();
      const programId = new PublicKey(getProgramId());

      // Derive PDAs
      const [userAccountPda] = getUserAccountPda(userPubkey, programId);
      const [userVaultTokenAccountPda] = getUserVaultTokenAccountPda(
        userPubkey,
        tokenMint,
        programId
      );
      const [vaultAuthorityPda] = getVaultAuthorityPda(programId);
      const [validPaymentPda] = getValidPaymentPda(tokenMint, programId);

      // Get user's token ATA (source)
      const userTokenAta = await getAssociatedTokenAddress(
        tokenMint,
        userPubkey
      );

      // Get token decimals: use provided value, or fetch from mint account, or default to 9
      let finalTokenDecimals = tokenDecimals ?? 9; // Use provided decimals if available
      if (finalTokenDecimals === 9 && tokenDecimals === undefined) {
        // Only fetch if not provided and we're using the default
        try {
          const mintInfo = await getMint(connection, tokenMint);
          finalTokenDecimals = mintInfo.decimals;
        } catch (err) {
          console.warn(
            `Failed to fetch mint decimals for ${tokenMint.toBase58()}, using default 9:`,
            err
          );
        }
      }

      // Convert amount to lamports using actual token decimals
      // Use string-based arithmetic to avoid JavaScript number precision issues
      const amountStr = amount.toString();
      const decimalIndex = amountStr.indexOf(".");
      let wholePart = amountStr;
      let fractionalPart = "";

      if (decimalIndex !== -1) {
        wholePart = amountStr.substring(0, decimalIndex);
        fractionalPart = amountStr.substring(decimalIndex + 1);
      }

      // Pad or truncate fractional part to match decimals
      const fractionalPadded = fractionalPart
        .padEnd(finalTokenDecimals, "0")
        .substring(0, finalTokenDecimals);

      // Combine whole and fractional parts using BigInt to avoid precision loss
      const decimalsMultiplier = BigInt(10 ** finalTokenDecimals);
      const amountInLamports =
        BigInt(wholePart || "0") * decimalsMultiplier +
        BigInt(fractionalPadded || "0");

      // Ensure the amount fits in u64 (max value: 2^64 - 1)
      const maxU64 = BigInt("18446744073709551615");
      if (amountInLamports > maxU64) {
        throw new Error(`Amount ${amountInLamports} exceeds maximum u64 value`);
      }

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
      const program = new anchor.Program(getIdl() as anchor.Idl, provider);

      // Build deposit instruction using Anchor
      const depositIx = await program.methods
        .deposit(new anchor.BN(amountInLamports.toString()))
        .accountsPartial({
          user: userPubkey,
          payer: userPubkey,
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
      console.log("depositIx", depositIx);

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
