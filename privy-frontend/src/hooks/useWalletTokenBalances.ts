import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
} from "@solana/spl-token";

export interface TokenBalance {
  mint: string;
  balance: number | null;
  decimals: number;
  loading: boolean;
  error: string | null;
}

export function useWalletTokenBalances(
  mintAddresses: string[],
  usdcMint?: string,
  stablecoinMint?: string
) {
  const { wallets } = useWallets();
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({});
  const [loading, setLoading] = useState(false);

  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

  console.log("useWalletTokenBalances | solanaWallet", solanaWallet);
  // Helper to determine default decimals based on token type
  const getDefaultDecimals = (mintAddress: string): number => {
    if (usdcMint && mintAddress === usdcMint) return 9; // need to change to 6 as we mature
    if (stablecoinMint && mintAddress === stablecoinMint) return 9; // need to change to 6 as we mature
    return 9; // Default for BLING and other tokens
  };

  const fetchBalances = async () => {
    if (!solanaWallet || mintAddresses.length === 0) {
      return;
    }

    setLoading(true);
    const connection = getConnection();
    const userPubkey = new PublicKey(solanaWallet.address);

    const newBalances: Record<string, TokenBalance> = {};

    // Initialize all balances with loading state
    for (const mintAddress of mintAddresses) {
      newBalances[mintAddress] = {
        mint: mintAddress,
        balance: null,
        decimals: getDefaultDecimals(mintAddress),
        loading: true,
        error: null,
      };
    }

    setBalances(newBalances);

    // Fetch balances for each mint
    for (const mintAddress of mintAddresses) {
      try {
        const mintPubkey = new PublicKey(mintAddress);

        // Get mint info first to determine decimals (always fetch this)
        // Use default based on token type (6 for USDC/stablecoin, 9 for others)
        let decimals = getDefaultDecimals(mintAddress);
        try {
          const mint = await getMint(connection, mintPubkey);
          decimals = mint.decimals;
        } catch (mintError) {
          console.warn(
            `Failed to fetch mint decimals for ${mintAddress}, using default ${decimals}:`,
            mintError
          );
        }

        // Get the associated token account address
        const tokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          userPubkey
        );

        try {
          // Try to get the token account using SPL token library
          const account = await getAccount(connection, tokenAccount);

          newBalances[mintAddress] = {
            mint: mintAddress,
            balance: Number(account.amount),
            decimals,
            loading: false,
            error: null,
          };
        } catch (accountError: any) {
          // Token account doesn't exist, balance is 0
          if (accountError.message?.includes("could not find account")) {
            newBalances[mintAddress] = {
              mint: mintAddress,
              balance: 0,
              decimals, // Use the fetched decimals
              loading: false,
              error: null,
            };
          } else {
            throw accountError;
          }
        }
      } catch (error) {
        newBalances[mintAddress] = {
          mint: mintAddress,
          balance: null,
          decimals: getDefaultDecimals(mintAddress),
          loading: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch balance",
        };
      }
    }

    setBalances(newBalances);
    setLoading(false);
  };

  useEffect(() => {
    if (solanaWallet && mintAddresses.length > 0) {
      fetchBalances();
    }
  }, [solanaWallet?.address, mintAddresses.join(",")]);

  return {
    balances,
    loading,
    refresh: fetchBalances,
  };
}
