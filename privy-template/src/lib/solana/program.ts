import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import idl from "./idl/opinions_market.json";

const PROGRAM_ID = new PublicKey(
  "4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm"
);

export interface OpinionsMarket {
  // This will be typed based on the IDL
  [key: string]: any;
}

export function getProgram(
  connection: Connection,
  wallet: WalletContextState
): Program<OpinionsMarket> | null {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return null;
  }

  // Create a wallet adapter that wraps Privy's wallet
  const anchorWallet: Wallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction.bind(wallet),
    signAllTransactions:
      wallet.signAllTransactions?.bind(wallet) ||
      (async (txs) => {
        const signed = [];
        for (const tx of txs) {
          signed.push(await wallet.signTransaction!(tx));
        }
        return signed;
      }),
  };

  const provider = new AnchorProvider(connection, anchorWallet, {
    commitment: "confirmed",
  });

  return new Program(idl as any, PROGRAM_ID, provider);
}
