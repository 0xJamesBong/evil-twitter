import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  USER_BY_HANDLE_QUERY,
  UserByHandleResult,
} from "@/lib/graphql/users/queries";

export function useUserByHandle(
  handle: string | null | undefined,
  first: number = 20
) {
  const { identityToken } = useIdentityToken();
  const [user, setUser] = useState<UserByHandleResult["userByHandle"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!handle) {
      setError("Handle is required");
      setLoading(false);
      setUser(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await graphqlRequest<UserByHandleResult>(
        USER_BY_HANDLE_QUERY,
        { handle, first },
        identityToken || undefined
      );

      if (data.userByHandle) {
        setUser(data.userByHandle);
      } else {
        setError("User not found");
        setUser(null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch user";
      setError(errorMessage);
      setUser(null);
      console.error("Failed to fetch user by handle:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, identityToken, first]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
