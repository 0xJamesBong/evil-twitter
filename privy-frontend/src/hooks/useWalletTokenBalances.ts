import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../lib/solana/connection";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

export interface TokenBalance {
  mint: string;
  balance: number | null;
  decimals: number;
  loading: boolean;
  error: string | null;
}

export function useWalletTokenBalances(mintAddresses: string[]) {
  const { wallets } = useWallets();
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({});
  const [loading, setLoading] = useState(false);

  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

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
        decimals: 9, // Default to 9, will be updated when we fetch
        loading: true,
        error: null,
      };
    }

    setBalances(newBalances);

    // Fetch balances for each mint
    for (const mintAddress of mintAddresses) {
      try {
        const mintPubkey = new PublicKey(mintAddress);

        // Get the associated token account address
        const tokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          userPubkey
        );

        try {
          // Try to get the token account using SPL token library
          const account = await getAccount(connection, tokenAccount);

          // Get mint info to determine decimals
          const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
          let decimals = 9; // Default
          if (mintInfo.value && "parsed" in mintInfo.value) {
            const parsed = mintInfo.value.parsed as any;
            if (parsed.info && parsed.info.decimals !== undefined) {
              decimals = parsed.info.decimals;
            }
          }

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
              decimals: 9,
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
          decimals: 9,
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
