import { useState } from "react";
import {
  useWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  pipe,
  createSolanaRpc,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  getBase64EncodedWireTransaction,
  address,
} from "@solana/kit";
import { getConnection, getNetwork } from "../lib/solana/connection";
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
      const network = getNetwork();

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

      // Build deposit instruction using Anchor
      const depositIx = await program.methods
        .deposit(new anchor.BN(amountInLamports.toString()))
        .accountsPartial({
          user: userPubkey,
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

      // Get RPC URL based on network
      const rpcUrl =
        network === "mainnet-beta"
          ? "https://api.mainnet-beta.solana.com"
          : network === "devnet"
          ? "https://api.devnet.solana.com"
          : "http://localhost:8899";

      // Configure RPC connection
      const { getLatestBlockhash } = createSolanaRpc(rpcUrl);
      const { value: latestBlockhash } = await getLatestBlockhash().send();

      // Convert Anchor instruction to @solana/kit format
      const instruction = {
        programAddress: address(depositIx.programId.toBase58()),
        accountAddresses: depositIx.keys.map((key) => ({
          address: address(key.pubkey.toBase58()),
          role: key.isWritable
            ? key.isSigner
              ? ("writableSigner" as const)
              : ("writable" as const)
            : key.isSigner
            ? ("readonlySigner" as const)
            : ("readonly" as const),
        })),
        data: depositIx.data,
      };

      // Create transaction using @solana/kit
      const transactionBase64 = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) =>
          setTransactionMessageFeePayer(address(solanaWallet.address), tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(instruction, tx),
        (tx) => compileTransaction(tx),
        (tx) => getBase64EncodedWireTransaction(tx)
      );

      // Send the transaction using Privy
      const result = await signAndSendTransaction({
        transaction: Buffer.from(transactionBase64, "base64"),
        wallet: solanaWallet,
      });

      // Convert signature from Uint8Array to base58 string
      const signature = bs58.encode(result.signature);
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
