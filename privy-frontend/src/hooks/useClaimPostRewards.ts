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

interface UseClaimPostRewardsReturn {
  claimAllRewards: () => Promise<void>;
  loading: boolean;
  error: string | null;
  claimedCount: number;
}

/**
 * Hook to claim all rewards for a post (all tokens)
 */
export function useClaimPostRewards(
  rewards: ClaimableRewardNode[],
  onSuccess?: () => void
): UseClaimPostRewardsReturn {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedCount, setClaimedCount] = useState(0);

  const claimAllRewards = async () => {
    if (!rewards || rewards.length === 0 || !identityToken) {
      const errorMsg = "Unable to claim rewards";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
      return;
    }

    setLoading(true);
    setError(null);
    setClaimedCount(0);

    const claimedTokens: string[] = [];
    const failedTokens: string[] = [];

    // Get mint addresses for token config
    const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";
    const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";
    const STABLECOIN_MINT = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

    // Claim each token reward sequentially
    for (const reward of rewards) {
      try {
        const tokenConfig = getTokenConfig(reward.tokenMint, BLING_MINT, USDC_MINT, STABLECOIN_MINT);

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
          // Backend returns amount already in token units (not lamports)
          const amount = parseFloat(result.claimPostReward.amount);
          const symbol = tokenConfig?.metadata.symbol || "TOKEN";
          claimedTokens.push(
            `${amount.toFixed(4)} ${symbol}`
          );
          setClaimedCount((prev) => prev + 1);
        }
      } catch (err: any) {
        console.error(
          `Failed to claim reward for token ${reward.tokenMint}:`,
          err
        );
        const tokenConfig = getTokenConfig(reward.tokenMint, BLING_MINT, USDC_MINT, STABLECOIN_MINT);
        failedTokens.push(tokenConfig?.metadata.symbol || "Unknown");
      }
    }

    setLoading(false);

    // Show success/error messages
    if (claimedTokens.length > 0) {
      if (claimedTokens.length === rewards.length) {
        enqueueSnackbar(
          `Successfully claimed all ${claimedTokens.length} reward${
            claimedTokens.length > 1 ? "s" : ""
          }!`,
          { variant: "success" }
        );
      } else {
        enqueueSnackbar(
          `Claimed ${claimedTokens.length} of ${rewards.length} rewards. ${
            failedTokens.length > 0 ? `Failed: ${failedTokens.join(", ")}` : ""
          }`,
          { variant: "warning" }
        );
      }
      onSuccess?.();
    } else {
      const errorMsg =
        failedTokens.length > 0
          ? `Failed to claim rewards: ${failedTokens.join(", ")}`
          : "Failed to claim rewards";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
    }
  };

  return {
    claimAllRewards,
    loading,
    error,
    claimedCount,
  };
}
