import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "../lib/graphql/client";
import {
  CREATE_ONCHAIN_USER_MUTATION,
  CreateOnchainUserMutationResult,
} from "../lib/graphql/user/mutations";

/**
 * Hook to create on-chain user account via backend (backend-signed)
 * This calls the backend GraphQL mutation which handles the Solana transaction
 * No wallet popup required - backend signs the transaction
 */
export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { identityToken } = useIdentityToken();

  const createUser = async (): Promise<string> => {
    if (!identityToken) {
      throw new Error("Not authenticated. Please log in first.");
    }

    setLoading(true);
    setError(null);

    try {
      const data = await graphqlRequest<CreateOnchainUserMutationResult>(
        CREATE_ONCHAIN_USER_MUTATION,
        undefined,
        identityToken
      );
      return data.createOnchainUser.signature;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create user";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createUser,
    loading,
    error,
  };
}
