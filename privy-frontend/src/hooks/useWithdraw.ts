import { useState } from "react";
import {
  useWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getConnection } from "../lib/solana/connection";
import OpinionsMarketIdl from "../lib/solana/target/localnet/idl/opinions_market.json";
import { OpinionsMarket as OpinionsMarketType } from "@/lib/solana/target/localnet/types/opinions_market";
import { getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import { useSolanaStore } from "../lib/stores/solanaStore";
import bs58 from "bs58";

const PROGRAM_ID = new PublicKey(
  "4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm"
);

// PDA seeds
const USER_ACCOUNT_SEED = Buffer.from("user_account");
const USER_VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("user_vault_token_account");
const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");

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

export function useWithdraw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { fetchVaultBalance } = useSolanaStore();

  // Support both Privy embedded wallet and external wallets (e.g., Phantom)
  // Prefer Privy embedded wallet, but fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

  const withdraw = async (
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

      // Derive PDAs
      const [userAccountPda] = getUserAccountPda(userPubkey);
      const [userVaultTokenAccountPda] = getUserVaultTokenAccountPda(
        userPubkey,
        tokenMint
      );
      const [vaultAuthorityPda] = getVaultAuthorityPda();

      // Get user's token ATA (destination)
      const userTokenDestAta = await getAssociatedTokenAddress(
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

      // Create a minimal wallet for Anchor (not used for signing)
      const dummyWallet = {
        publicKey: userPubkey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };

      // Create Anchor provider and program
      const provider = new anchor.AnchorProvider(
        connection,
        dummyWallet as any,
        { commitment: "confirmed" }
      );
      anchor.setProvider(provider);
      const program = new anchor.Program(
        OpinionsMarketIdl as OpinionsMarketType,
        provider
      ) as anchor.Program<OpinionsMarketType>;

      // Build withdraw instruction using Anchor
      const withdrawIx = await program.methods
        .withdraw(new anchor.BN(amountInLamports.toString()))
        .accountsPartial({
          user: userPubkey,
          payer: solanaWallet.address,
          userAccount: userAccountPda,
          tokenMint: tokenMint,
          userTokenDestAta: userTokenDestAta,
          userVaultTokenAccount: userVaultTokenAccountPda,
          vaultAuthority: vaultAuthorityPda,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .instruction();

      // Build a versioned transaction with the user's wallet as fee payer
      const latestBlockhash = await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: userPubkey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [withdrawIx],
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
      console.log("Withdraw transaction sent:", signature);

      // Refresh balance after a short delay
      setTimeout(() => {
        fetchVaultBalance(userPubkey, tokenMint);
      }, 2000);

      return signature;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to withdraw";
      console.error("Withdraw error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error };
}
