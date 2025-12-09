"use client";

import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  CLAIM_TIPS_MUTATION,
  ClaimTipsResult,
} from "@/lib/graphql/users/mutations";

export function useClaimTips() {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimTips = async (
    tokenMint?: string | null
  ): Promise<{ signature: string; amountClaimed: number }> => {
    if (!identityToken) {
      enqueueSnackbar("Please log in to claim tips", { variant: "error" });
      throw new Error("No identity token available");
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest<ClaimTipsResult>(
        CLAIM_TIPS_MUTATION,
        {
          input: {
            tokenMint: tokenMint || null,
          },
        },
        identityToken
      );

      if (result.claimTips.success) {
        enqueueSnackbar(
          `Successfully claimed ${result.claimTips.amountClaimed} tips`,
          { variant: "success" }
        );
        return {
          signature: result.claimTips.signature,
          amountClaimed: result.claimTips.amountClaimed,
        };
      } else {
        throw new Error("Failed to claim tips");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to claim tips";
      enqueueSnackbar(errorMessage, { variant: "error" });
      console.error("Claim tips error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { claimTips, loading, error };
}
