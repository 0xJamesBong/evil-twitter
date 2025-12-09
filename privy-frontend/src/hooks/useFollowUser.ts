"use client";

import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { graphqlRequest } from "@/lib/graphql/client";
import {
  FOLLOW_USER_MUTATION,
  FollowUserResult,
  UNFOLLOW_USER_MUTATION,
  UnfollowUserResult,
} from "@/lib/graphql/users/mutations";

export function useFollowUser() {
  const { identityToken } = useIdentityToken();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const followUser = async (userId: string): Promise<boolean> => {
    if (!identityToken) {
      enqueueSnackbar("Please log in to follow users", { variant: "error" });
      return false;
    }

    setLoading(true);
    try {
      const result = await graphqlRequest<FollowUserResult>(
        FOLLOW_USER_MUTATION,
        { input: { userId } },
        identityToken
      );

      if (result.followUser.success) {
        enqueueSnackbar("Successfully followed user", { variant: "success" });
        return true;
      } else {
        enqueueSnackbar("Failed to follow user", { variant: "error" });
        return false;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to follow user";
      enqueueSnackbar(errorMessage, { variant: "error" });
      console.error("Failed to follow user:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async (userId: string): Promise<boolean> => {
    if (!identityToken) {
      enqueueSnackbar("Please log in to unfollow users", { variant: "error" });
      return false;
    }

    setLoading(true);
    try {
      const result = await graphqlRequest<UnfollowUserResult>(
        UNFOLLOW_USER_MUTATION,
        { input: { userId } },
        identityToken
      );

      if (result.unfollowUser.success) {
        enqueueSnackbar("Successfully unfollowed user", { variant: "success" });
        return true;
      } else {
        enqueueSnackbar("Failed to unfollow user", { variant: "error" });
        return false;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to unfollow user";
      enqueueSnackbar(errorMessage, { variant: "error" });
      console.error("Failed to unfollow user:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { followUser, unfollowUser, loading };
}

