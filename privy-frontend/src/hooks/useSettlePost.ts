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
import { PostPotBalances } from "@/lib/graphql/tweets/types";

/**
 * Hook to settle a post for all available tokens
 * This will settle the post for BLING, USDC, and stablecoin (if they have balances)
 */
export function useSettlePost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();

  /**
   * Get token mints that have balances from pot balances
   */
  const getTokenMintsWithBalances = (
    potBalances: PostPotBalances | null | undefined
  ): string[] => {
    const tokenMints: string[] = [];
    const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";
    const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";
    const STABLECOIN_MINT = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

    if (!potBalances) {
      // If no pot balances, default to BLING
      if (BLING_MINT) tokenMints.push(BLING_MINT);
      return tokenMints;
    }

    // Add tokens that have balances > 0
    if (potBalances.bling > 0 && BLING_MINT) {
      tokenMints.push(BLING_MINT);
    }
    if (potBalances.usdc && potBalances.usdc > 0 && USDC_MINT) {
      tokenMints.push(USDC_MINT);
    }
    if (
      potBalances.stablecoin &&
      potBalances.stablecoin > 0 &&
      STABLECOIN_MINT
    ) {
      tokenMints.push(STABLECOIN_MINT);
    }

    // If no tokens have balances, default to BLING
    if (tokenMints.length === 0 && BLING_MINT) {
      tokenMints.push(BLING_MINT);
    }

    return tokenMints;
  };

  const settlePost = async (
    tweetId: string,
    potBalances?: PostPotBalances | null
  ): Promise<string[]> => {
    if (!identityToken) {
      throw new Error("No identity token available. Please log in.");
    }

    // Get token mints from pot balances
    const tokenMints = getTokenMintsWithBalances(potBalances);

    if (tokenMints.length === 0) {
      throw new Error("No token mints available to settle");
    }

    setLoading(true);
    setError(null);

    const signatures: string[] = [];

    try {
      console.log(
        `📊 useSettlePost: Settling post ${tweetId} for ${tokenMints.length} token(s)...`
      );

      // Settle for each token mint
      for (const tokenMint of tokenMints) {
        try {
          console.log(
            `📊 useSettlePost: Settling post ${tweetId} for token ${tokenMint}...`
          );

          const input: SettlePostInput = {
            tweetId,
            tokenMint,
          };

          const result = await graphqlRequest<SettlePostResult>(
            SETTLE_POST_MUTATION,
            { input },
            identityToken
          );

          if (result.settlePost?.signature) {
            signatures.push(result.settlePost.signature);
            console.log(
              `✅ useSettlePost: Settled for ${tokenMint}, signature: ${result.settlePost.signature}`
            );
          }
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : `Failed to settle for token ${tokenMint}`;
          console.error(`❌ useSettlePost: Error settling ${tokenMint}:`, msg);
          // Continue with other tokens even if one fails
          enqueueSnackbar(`Failed to settle for token ${tokenMint}: ${msg}`, {
            variant: "warning",
          });
        }
      }

      if (signatures.length > 0) {
        enqueueSnackbar(
          `Post settled successfully for ${signatures.length} token(s)!`,
          { variant: "success" }
        );
      } else {
        throw new Error("Failed to settle post for any tokens");
      }

      return signatures;
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
