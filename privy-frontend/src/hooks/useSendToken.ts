"use client";

import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  SEND_TOKEN_MUTATION,
  SendTokenResult,
} from "@/lib/graphql/users/mutations";

export function useSendToken() {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendToken = async (
    recipientUserId: string,
    amount: number,
    tokenMint?: string | null
  ): Promise<string> => {
    if (!identityToken) {
      enqueueSnackbar("Please log in to send tokens", { variant: "error" });
      throw new Error("No identity token available");
    }

    setLoading(true);
    setError(null);

    try {
      const result = await graphqlRequest<SendTokenResult>(
        SEND_TOKEN_MUTATION,
        {
          input: {
            recipientUserId,
            amount,
            tokenMint: tokenMint || null,
          },
        },
        identityToken
      );

      if (result.sendToken.success) {
        enqueueSnackbar("Tokens sent successfully", { variant: "success" });
        return result.sendToken.signature;
      } else {
        throw new Error("Failed to send tokens");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send tokens";
      enqueueSnackbar(errorMessage, { variant: "error" });
      console.error("Send token error:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { sendToken, loading, error };
}
