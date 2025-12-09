"use client";

import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  TIP_VAULT_BALANCES_QUERY,
  TipVaultBalancesResult,
} from "@/lib/graphql/users/queries";

export function useTipVaultBalances() {
  const { identityToken } = useIdentityToken();
  const [balances, setBalances] = useState<{
    bling: number;
    usdc: number | null;
    stablecoin: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!identityToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest<TipVaultBalancesResult>(
        TIP_VAULT_BALANCES_QUERY,
        undefined,
        identityToken
      );

      if (result.me?.tipVaultBalances) {
        setBalances(result.me.tipVaultBalances);
      } else {
        setBalances({ bling: 0, usdc: null, stablecoin: null });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch tip vault balances";
      console.error("Failed to fetch tip vault balances:", err);
      setError(errorMessage);
      setBalances({ bling: 0, usdc: null, stablecoin: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [identityToken]);

  return { balances, loading, error, refetch: fetchBalances };
}
