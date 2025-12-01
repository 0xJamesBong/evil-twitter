import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection";
import { useNetworkStore } from "../stores/networkStore";
import idlLocal from "./target/localnet/idl/opinions_market.json";
import idlDev from "./target/devnet/idl/opinions_market.json";
import { OpinionsMarket as OpinionsMarketTypeLocal } from "./target/localnet/types/opinions_market";
import { OpinionsMarket as OpinionsMarketTypeDev } from "./target/devnet/types/opinions_market";

// PDA seeds
const CONFIG_SEED = Buffer.from("config");
const VALID_PAYMENT_SEED = Buffer.from("valid_payment");

type Network = "localnet" | "devnet";

interface NetworkConfig {
  idl: anchor.Idl;
  programId: string;
}

const networks: Record<Network, NetworkConfig> = {
  localnet: {
    idl: idlLocal as anchor.Idl,
    programId: process.env.NEXT_PUBLIC_PROGRAM_ID_LOCAL!,
  },
  devnet: {
    idl: idlDev as anchor.Idl,
    programId: process.env.NEXT_PUBLIC_PROGRAM_ID_DEV!,
  },
};

export function getIdl() {
  const network = useNetworkStore.getState().network;
  return network === "devnet" ? idlDev : idlLocal;
}

export function getProgram(
  wallet: Wallet
): anchor.Program<OpinionsMarketTypeLocal | OpinionsMarketTypeDev> {
  const network = useNetworkStore.getState().network;

  // Validate network and default to localnet if invalid
  const networkKey: Network =
    network === "devnet" || network === "localnet" ? network : "localnet";

  const config = networks[networkKey];
  const connection = getConnection();

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  anchor.setProvider(provider);

  const program = new anchor.Program(config.idl, provider);

  // Type assertion for network-specific IDL types
  return program as unknown as anchor.Program<
    OpinionsMarketTypeLocal | OpinionsMarketTypeDev
  >;
}

export function getProgramId(wallet: Wallet): string | null {
  const program = getProgram(wallet);
  return program.programId.toBase58();
}

/**
 * Convert a Privy wallet to Anchor wallet format
 */
export function privyWalletToAnchor(wallet: any): anchor.Wallet {
  if (!wallet?.address) {
    throw new Error("Wallet address is not available");
  }
  return {
    publicKey: new PublicKey(wallet.address),
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  } as anchor.Wallet;
}

/**
 * Get Config PDA
 */
export function getConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

/**
 * Get ValidPayment PDA
 */
export function getValidPaymentPda(
  tokenMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VALID_PAYMENT_SEED, tokenMint.toBuffer()],
    programId
  );
}

/**
 * Fetch Config account data
 */
export async function fetchConfig(wallet: any): Promise<{
  admin: string;
  payerAuthority: string;
  blingMint: string;
  baseDurationSecs: number;
  maxDurationSecs: number;
  extensionPerVoteSecs: number;
}> {
  if (!wallet?.address) {
    throw new Error("Wallet address is not available");
  }

  const programIdStr = getProgramId();
  if (!programIdStr) {
    throw new Error("Program ID is not configured for this network");
  }

  const anchorWallet = privyWalletToAnchor(wallet);
  const program = getProgram(anchorWallet);
  const programId = new PublicKey(programIdStr);
  const [configPda] = getConfigPda(programId);
  const configAccount = await program.account.config.fetch(configPda);

  const toNumber = (val: any): number =>
    typeof val === "number" ? val : (val as any).toNumber?.() ?? Number(val);

  return {
    admin: configAccount.admin.toBase58(),
    payerAuthority: configAccount.payerAuthroity.toBase58(),
    blingMint: configAccount.blingMint.toBase58(),
    baseDurationSecs: toNumber(configAccount.baseDurationSecs),
    maxDurationSecs: toNumber(configAccount.maxDurationSecs),
    extensionPerVoteSecs: toNumber(configAccount.extensionPerVoteSecs),
  };
}

/**
 * Fetch ValidPayment account data for a token mint
 */
export async function fetchValidPayment(
  wallet: any,
  tokenMint: string
): Promise<{
  tokenMint: string;
  priceInBling: number;
  enabled: boolean;
} | null> {
  try {
    if (!wallet?.address) {
      throw new Error("Wallet address is not available");
    }

    if (!tokenMint) {
      throw new Error("Token mint address is required");
    }

    const programIdStr = getProgramId();
    if (!programIdStr) {
      throw new Error("Program ID is not configured for this network");
    }

    const anchorWallet = privyWalletToAnchor(wallet);
    const program = getProgram(anchorWallet);
    const programId = new PublicKey(programIdStr);
    const mintPubkey = new PublicKey(tokenMint);
    const [validPaymentPda] = getValidPaymentPda(mintPubkey, programId);
    const paymentAccount = await program.account.validPayment.fetch(
      validPaymentPda
    );

    const toNumber = (val: any): number =>
      typeof val === "number" ? val : (val as any).toNumber?.() ?? Number(val);

    return {
      tokenMint: paymentAccount.tokenMint.toBase58(),
      priceInBling: toNumber(paymentAccount.priceInBling),
      enabled: paymentAccount.enabled,
    };
  } catch (err) {
    console.warn(`Failed to fetch ValidPayment for ${tokenMint}:`, err);
    return null;
  }
}
