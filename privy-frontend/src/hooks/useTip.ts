"use client";

import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { graphqlRequest } from "@/lib/graphql/client";
import { TIP_MUTATION, TipResult } from "@/lib/graphql/users/mutations";

export function useTip() {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tip = async (
    recipientUserId: string,
    amount: number,
    tokenMint?: string | null,
    postId?: string | null
  ): Promise<string> => {
    if (!identityToken) {
      enqueueSnackbar("Please log in to tip", { variant: "error" });
      throw new Error("No identity token available");
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest<TipResult>(
        TIP_MUTATION,
        {
          input: {
            recipientUserId,
            postId: postId || null,
            amount,
            tokenMint: tokenMint || null,
          },
        },
        identityToken
      );

      if (result.tip.success) {
        enqueueSnackbar("Tip sent successfully", { variant: "success" });
        return result.tip.signature;
      } else {
        throw new Error("Failed to tip");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to tip";
      enqueueSnackbar(errorMessage, { variant: "error" });
      console.error("Tip error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { tip, loading, error };
}
