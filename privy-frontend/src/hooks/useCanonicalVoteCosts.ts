import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CANONICAL_VOTE_COSTS_QUERY,
  CanonicalVoteCostsResult,
} from "@/lib/graphql/users/queries";

export function useCanonicalVoteCosts(side: "Pump" | "Smack") {
  const { identityToken } = useIdentityToken();
  const [costs, setCosts] = useState<{
    bling: number | null;
    usdc: number | null;
    stablecoin: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identityToken) {
      setCosts(null);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchCosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await graphqlRequest<CanonicalVoteCostsResult>(
          CANONICAL_VOTE_COSTS_QUERY,
          { side },
          identityToken
        );
        setCosts(result.canonicalVoteCosts);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch costs";
        setError(errorMessage);
        setCosts(null);
        console.error(`Failed to fetch canonical ${side} costs:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, [identityToken, side]);

  return { costs, loading, error };
}

