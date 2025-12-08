import { useState, useEffect } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { graphqlRequest } from "@/lib/graphql/client";
import { USER_BY_ID_QUERY, UserByIdResult } from "@/lib/graphql/users/queries";

export function useUserById(
  userId: string | null | undefined,
  first: number = 20
) {
  const { identityToken } = useIdentityToken();
  const [user, setUser] = useState<UserByIdResult["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!userId) {
      setError("User ID is required");
      setLoading(false);
      setUser(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await graphqlRequest<UserByIdResult>(
        USER_BY_ID_QUERY,
        { id: userId, first },
        identityToken || undefined
      );

      if (data.user) {
        setUser(data.user);
      } else {
        setError("User not found");
        setUser(null);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch user";
      setError(errorMessage);
      setUser(null);
      console.error("Failed to fetch user by ID:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, identityToken, first]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
