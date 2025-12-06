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

interface UseClaimRewardOptions {
  tweetId: string;
  tokenMint?: string;
}

interface UseClaimRewardReturn {
  claimReward: () => Promise<void>;
  loading: boolean;
  claimed: boolean;
  error: string | null;
}

export function useClaimReward({
  tweetId,
  tokenMint,
}: UseClaimRewardOptions): UseClaimRewardReturn {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimReward = async () => {
    if (!tweetId || !identityToken) {
      const errorMsg = "Unable to claim rewards";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Default to BLING token if not provided
      const token = tokenMint || process.env.NEXT_PUBLIC_BLING_MINT || "";
      const tokenConfig = getTokenConfig(token);

      const input: ClaimRewardInput = {
        tweetId,
        tokenMint: token,
      };

      const result = await graphqlRequest<ClaimRewardResult>(
        CLAIM_POST_REWARD_MUTATION,
        { input },
        identityToken
      );

      if (result.claimPostReward) {
        setClaimed(true);
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
    claimed,
    error,
  };
}
