"use client";

import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import {
  SETTLE_POST_MUTATION,
  SettlePostInput,
  SettlePostResult,
} from "@/lib/graphql/tweets/mutations";
import { graphqlRequest } from "@/lib/graphql/client";
import { useSnackbar } from "notistack";

/**
 * Hook to settle a post for all available tokens
 * The backend now automatically loops through all tokens (BLING, USDC, stablecoin)
 * and chains all settlement + distribution instructions into a single transaction
 */
export function useSettlePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();

  const settlePost = async (
    tweetId: string,
    onSuccess?: () => void | Promise<void>
  ): Promise<string> => {
    if (!identityToken) {
      throw new Error("No identity token available. Please log in.");
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        `📊 useSettlePost: Settling post ${tweetId} for all tokens...`
      );

      const input: SettlePostInput = {
        tweetId,
      };

      const result = await graphqlRequest<SettlePostResult>(
        SETTLE_POST_MUTATION,
        { input },
        identityToken
      );

      if (result.settlePost?.signature) {
        console.log(
          `✅ useSettlePost: Post settled successfully, signature: ${result.settlePost.signature}`
        );
        enqueueSnackbar("Post settled successfully for all tokens!", {
          variant: "success",
        });

        // Call onSuccess callback if provided (e.g., to refresh data)
        if (onSuccess) {
          await onSuccess();
        }

        return result.settlePost.signature;
      } else {
        throw new Error("No signature returned from settlement");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to settle post";
      console.error("❌ useSettlePost: Error occurred:", msg);
      setError(msg);
      enqueueSnackbar(msg, { variant: "error" });
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { settlePost, loading, error };
}
