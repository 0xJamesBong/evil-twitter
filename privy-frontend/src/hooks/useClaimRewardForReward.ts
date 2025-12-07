import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CLAIM_POST_REWARD_MUTATION,
  ClaimRewardInput,
  ClaimRewardResult,
} from "@/lib/graphql/tweets/mutations";
import { getTokenConfig } from "@/lib/utils/tokens";
import { formatTokenBalance } from "@/lib/utils/formatting";
import { ClaimableRewardNode } from "@/lib/graphql/tweets/queries";

interface UseClaimRewardForRewardReturn {
  claimReward: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to claim a specific reward from a ClaimableRewardNode
 */
export function useClaimRewardForReward(
  reward: ClaimableRewardNode | null,
  onSuccess?: () => void
): UseClaimRewardForRewardReturn {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimReward = async () => {
    if (!reward || !identityToken) {
      const errorMsg = "Unable to claim rewards";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tokenConfig = getTokenConfig(reward.tokenMint);

      const input: ClaimRewardInput = {
        tweetId: reward.tweetId,
        tokenMint: reward.tokenMint,
      };

      const result = await graphqlRequest<ClaimRewardResult>(
        CLAIM_POST_REWARD_MUTATION,
        { input },
        identityToken
      );

      if (result.claimPostReward) {
        const amount = parseFloat(result.claimPostReward.amount);
        const decimals = tokenConfig?.metadata.decimals || 9;
        const symbol = tokenConfig?.metadata.symbol || "TOKEN";
        enqueueSnackbar(
          `Successfully claimed ${formatTokenBalance(
            amount,
            decimals
          )} ${symbol}!`,
          { variant: "success" }
        );
        onSuccess?.();
      }
    } catch (err: any) {
      console.error("Failed to claim reward:", err);
      const errorMsg =
        err?.response?.errors?.[0]?.message || "Failed to claim reward";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return {
    claimReward,
    loading,
    error,
  };
}
