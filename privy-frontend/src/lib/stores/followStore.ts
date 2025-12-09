import { create } from "zustand";
import { graphqlRequest } from "../graphql/client";
import {
  USER_FOLLOWERS_QUERY,
  USER_FOLLOWING_QUERY,
  UserFollowersResult,
  UserFollowingResult,
} from "../graphql/users/queries";

export type FollowUser = {
  id: string;
  privyId: string;
  wallet: string;
  loginType: string;
  email: string | null;
  status: string;
  createdAt: string;
  socialScore: number | null;
  followersCount: number;
  followingCount: number;
  isFollowedByViewer: boolean;
  profile: {
    id: string;
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    status: string;
    createdAt: string;
  } | null;
};

type FollowState = {
  // Cache for followers/following by user ID
  followersCache: Record<string, FollowUser[]>;
  followingCache: Record<string, FollowUser[]>;
  totalCounts: Record<string, { followers: number; following: number }>;
  loading: Record<string, { followers: boolean; following: boolean }>;
  errors: Record<
    string,
    { followers: string | null; following: string | null }
  >;
};

type FollowActions = {
  fetchFollowers: (
    userId: string,
    identityToken: string | undefined,
    first?: number
  ) => Promise<void>;
  fetchFollowing: (
    userId: string,
    identityToken: string | undefined,
    first?: number
  ) => Promise<void>;
  updateFollowStatus: (userId: string, isFollowing: boolean) => void;
  clearCache: (userId?: string) => void;
  getFollowers: (userId: string) => FollowUser[];
  getFollowing: (userId: string) => FollowUser[];
  getTotalCounts: (
    userId: string
  ) => { followers: number; following: number } | null;
  isLoading: (userId: string, type: "followers" | "following") => boolean;
  getError: (userId: string, type: "followers" | "following") => string | null;
};

export const useFollowStore = create<FollowState & FollowActions>(
  (set, get) => ({
    followersCache: {},
    followingCache: {},
    totalCounts: {},
    loading: {},
    errors: {},

    fetchFollowers: async (userId, identityToken, first = 50) => {
      const state = get();
      if (state.loading[userId]?.followers) return;

      set((state) => ({
        loading: {
          ...state.loading,
          [userId]: { ...state.loading[userId], followers: true },
        },
        errors: {
          ...state.errors,
          [userId]: { ...state.errors[userId], followers: null },
        },
      }));

      try {
        const result = await graphqlRequest<UserFollowersResult>(
          USER_FOLLOWERS_QUERY,
          { userId, first },
          identityToken
        );

        if (result.user?.followers) {
          const followers = result.user.followers.edges.map(
            (edge) => edge.node
          );
          set((state) => ({
            followersCache: {
              ...state.followersCache,
              [userId]: followers,
            },
            totalCounts: {
              ...state.totalCounts,
              [userId]: {
                ...state.totalCounts[userId],
                followers: result.user!.followers.totalCount,
              },
            },
            loading: {
              ...state.loading,
              [userId]: { ...state.loading[userId], followers: false },
            },
          }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch followers";
        set((state) => ({
          errors: {
            ...state.errors,
            [userId]: { ...state.errors[userId], followers: errorMessage },
          },
          loading: {
            ...state.loading,
            [userId]: { ...state.loading[userId], followers: false },
          },
        }));
      }
    },

    fetchFollowing: async (userId, identityToken, first = 50) => {
      const state = get();
      if (state.loading[userId]?.following) return;

      set((state) => ({
        loading: {
          ...state.loading,
          [userId]: { ...state.loading[userId], following: true },
        },
        errors: {
          ...state.errors,
          [userId]: { ...state.errors[userId], following: null },
        },
      }));

      try {
        const result = await graphqlRequest<UserFollowingResult>(
          USER_FOLLOWING_QUERY,
          { userId, first },
          identityToken
        );

        if (result.user?.following) {
          const following = result.user.following.edges.map(
            (edge) => edge.node
          );
          set((state) => ({
            followingCache: {
              ...state.followingCache,
              [userId]: following,
            },
            totalCounts: {
              ...state.totalCounts,
              [userId]: {
                ...state.totalCounts[userId],
                following: result.user!.following.totalCount,
              },
            },
            loading: {
              ...state.loading,
              [userId]: { ...state.loading[userId], following: false },
            },
          }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch following";
        set((state) => ({
          errors: {
            ...state.errors,
            [userId]: { ...state.errors[userId], following: errorMessage },
          },
          loading: {
            ...state.loading,
            [userId]: { ...state.loading[userId], following: false },
          },
        }));
      }
    },

    updateFollowStatus: (userId, isFollowing) => {
      const state = get();
      // Update isFollowedByViewer in all cached users
      const updateUser = (user: FollowUser) => {
        if (user.id === userId) {
          return { ...user, isFollowedByViewer: isFollowing };
        }
        return user;
      };

      set({
        followersCache: Object.fromEntries(
          Object.entries(state.followersCache).map(([key, users]) => [
            key,
            users.map(updateUser),
          ])
        ),
        followingCache: Object.fromEntries(
          Object.entries(state.followingCache).map(([key, users]) => [
            key,
            users.map(updateUser),
          ])
        ),
      });
    },

    clearCache: (userId) => {
      if (userId) {
        set((state) => {
          const newState = { ...state };
          delete newState.followersCache[userId];
          delete newState.followingCache[userId];
          delete newState.totalCounts[userId];
          delete newState.loading[userId];
          delete newState.errors[userId];
          return newState;
        });
      } else {
        set({
          followersCache: {},
          followingCache: {},
          totalCounts: {},
          loading: {},
          errors: {},
        });
      }
    },

    getFollowers: (userId) => {
      return get().followersCache[userId] || [];
    },

    getFollowing: (userId) => {
      return get().followingCache[userId] || [];
    },

    getTotalCounts: (userId) => {
      return get().totalCounts[userId] || null;
    },

    isLoading: (userId, type) => {
      return get().loading[userId]?.[type] || false;
    },

    getError: (userId, type) => {
      return get().errors[userId]?.[type] || null;
    },
  })
);
