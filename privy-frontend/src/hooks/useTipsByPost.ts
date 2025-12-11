"use client";

import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  TIPS_BY_POST_QUERY,
  TipsByPostResult,
} from "@/lib/graphql/users/queries";

export interface TipsByPost {
  postId: string | null;
  postIdHash: string | null;
  tokenMint: string;
  totalAmount: number;
  claimed: boolean;
}

export function useTipsByPost() {
  const { identityToken } = useIdentityToken();
  const [tips, setTips] = useState<TipsByPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTips = async () => {
    if (!identityToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest<TipsByPostResult>(
        TIPS_BY_POST_QUERY,
        undefined,
        identityToken
      );

      setTips(result.tipsByPost);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch tips by post";
      console.error("Failed to fetch tips by post:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, [identityToken]);

  return { tips, loading, error, refetch: fetchTips };
}

