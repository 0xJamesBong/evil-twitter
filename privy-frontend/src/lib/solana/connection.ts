import { Connection, clusterApiUrl, Commitment } from "@solana/web3.js";

const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "localnet";
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

export function getConnection(): Connection {
  let rpcUrl: string;

  if (SOLANA_RPC_URL) {
    rpcUrl = SOLANA_RPC_URL;
  } else {
    // Default RPC URLs based on network
    switch (SOLANA_NETWORK) {
      case "mainnet-beta":
        rpcUrl = clusterApiUrl("mainnet-beta");
        break;
      case "devnet":
        rpcUrl = clusterApiUrl("devnet");
        break;
      case "localnet":
      default:
        rpcUrl = "http://localhost:8899";
        break;
    }
  }

  return new Connection(rpcUrl, "confirmed" as Commitment);
}

export function getNetwork(): string {
  console.log("getNetwork | SOLANA_NETWORK", SOLANA_NETWORK);
  return SOLANA_NETWORK;
}
