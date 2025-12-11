"use client";

import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CLAIM_TIPS_BY_POST_MUTATION,
  ClaimTipsByPostResult,
} from "@/lib/graphql/users/mutations";

export function useClaimTipsByPost() {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimTipsByPost = async (
    postId: string,
    tokenMint?: string | null
  ): Promise<string> => {
    if (!identityToken) {
      enqueueSnackbar("Please log in to claim tips", { variant: "error" });
      throw new Error("No identity token available");
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest<ClaimTipsByPostResult>(
        CLAIM_TIPS_BY_POST_MUTATION,
        {
          input: {
            postId,
            tokenMint: tokenMint || null,
          },
        },
        identityToken
      );

      if (result.claimTipsByPost.success) {
        enqueueSnackbar("Tips claimed successfully", { variant: "success" });
        return result.claimTipsByPost.signature;
      } else {
        throw new Error("Failed to claim tips");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to claim tips";
      enqueueSnackbar(errorMessage, { variant: "error" });
      console.error("Claim tips by post error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { claimTipsByPost, loading, error };
}

