import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CANONICAL_VOTE_COST_QUERY,
  CanonicalVoteCostResult,
} from "@/lib/graphql/users/queries";

export function useCanonicalVoteCost(side: "Pump" | "Smack") {
  const { identityToken } = useIdentityToken();
  const [cost, setCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identityToken) {
      setCost(null);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchCost = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await graphqlRequest<CanonicalVoteCostResult>(
          CANONICAL_VOTE_COST_QUERY,
          { side },
          identityToken
        );
        setCost(result.canonicalVoteCost);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch cost";
        setError(errorMessage);
        setCost(null);
        console.error(`Failed to fetch canonical ${side} cost:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchCost();
  }, [identityToken, side]);

  return { cost, loading, error };
}
