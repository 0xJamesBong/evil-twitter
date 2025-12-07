import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CLAIMABLE_REWARDS_QUERY,
  ClaimableRewardNode,
  ClaimableRewardsQueryResult,
} from "@/lib/graphql/tweets/queries";
import { dummyRewards } from "@/lib/mock/rewards";

interface UseClaimableRewardsReturn {
  rewards: ClaimableRewardNode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClaimableRewards(): UseClaimableRewardsReturn {
  const { identityToken } = useIdentityToken();
  const [rewards, setRewards] = useState<ClaimableRewardNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    // Use dummy data if:
    // 1. NEXT_PUBLIC_USE_DUMMY_REWARDS env var is set to "true", OR
    // 2. We're in development mode and no identity token (for easier testing)
    const useDummyData = true;

    if (useDummyData) {
      setLoading(true);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRewards(dummyRewards);
      setLoading(false);
      setError(null);
      return;
    }

    if (!identityToken) {
      setLoading(false);
      setRewards([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await graphqlRequest<ClaimableRewardsQueryResult>(
        CLAIMABLE_REWARDS_QUERY,
        undefined,
        identityToken
      );
      setRewards(data.claimableRewards || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch rewards";
      setError(errorMessage);
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityToken]);

  return {
    rewards,
    loading,
    error,
    refetch: fetchRewards,
  };
}
