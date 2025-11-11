import { create } from "zustand";
import { API_BASE_URL } from "../config/api";
import { graphqlRequest } from "../graphql/client";
import {
  PROFILE_QUERY,
  ProfileQueryResult,
  USER_BY_SUPABASE_ID_QUERY,
  UserBySupabaseIdQueryResult,
} from "../graphql/queries";
import { User } from "./authStore";
import { useTweetsStore, Tweet, normalizeTweet } from "./tweetsStore";
import {
  CREATE_USER_MUTATION,
  CreateUserMutationResult,
} from "../graphql/mutations";
import {
  mapGraphBalances,
  mapGraphTweetNode,
  mapGraphUserToBackend,
} from "./utils";

export interface BackendUser {
  _id: { $oid: string };
  supabase_id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  created_at: { $date: { $numberLong: string } };
  followers_count: number;
  following_count: number;
  tweets_count: number;
  dollar_conversion_rate: number;
  weapon_ids?: { $oid: string }[];
}

interface BackendUserState {
  user: BackendUser | null;
  isLoading: boolean;
  error: string | null;
  // Token balances (for any user being viewed)
  balances: { [key: string]: number } | null;
  loadingBalances: boolean;
  profileUser: BackendUser | null;
  profileUserId: string | null;
  profileTweets: Tweet[];
  profileCompositeLoading: boolean;
  profileCompositeError: string | null;
}

interface BackendUserActions {
  createUser: (user: User) => Promise<void>;
  fetchUser: (supabaseId: string) => Promise<void>;
  fetchUserById: (userId: string) => Promise<void>;
  fetchBalances: (userId: string) => Promise<void>;
  adjustFollowersCount: (delta: number) => void;
  syncWithSupabase: (supabaseUser: any) => Promise<void>;
  clearUser: () => void;
  fetchProfileComposite: (
    userId: string,
    viewerId?: string
  ) => Promise<{ user: BackendUser; tweets: Tweet[] } | null>;
  adjustProfileFollowers: (delta: number) => void;
}

export const useBackendUserStore = create<
  BackendUserState & BackendUserActions
>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  balances: null,
  loadingBalances: false,
  profileUser: null,
  profileUserId: null,
  profileTweets: [],
  profileCompositeLoading: false,
  profileCompositeError: null,
  createUser: async (user: User) => {
    set({ isLoading: true, error: null });
    try {
      const data = await graphqlRequest<CreateUserMutationResult>(
        CREATE_USER_MUTATION,
        {
          input: {
            supabaseId: user.id,
            username: user.user_metadata?.username || user.email?.split("@")[0],
            displayName:
              user.user_metadata?.display_name || user.email?.split("@")[0],
            email: user.email,
            avatarUrl: user.user_metadata?.avatar_url || null,
            bio: null,
          },
        }
      );

      const newUser = mapGraphUserToBackend(data.userCreate.user);
      set({ user: newUser, isLoading: false });
    } catch (error) {
      // If user already exists, fetch them instead
      if (
        error instanceof Error &&
        (error.message.includes("already exists") ||
          error.message.includes("409") ||
          error.message.includes("Conflict"))
      ) {
        console.log("User already exists, fetching...");
        await get().fetchUser(user.id);
      } else {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
          isLoading: false,
        });
      }
    }
  },

  fetchUser: async (supabaseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await graphqlRequest<UserBySupabaseIdQueryResult>(
        USER_BY_SUPABASE_ID_QUERY,
        { supabaseId }
      );
      if (data.userBySupabaseId) {
        const backendUser = mapGraphUserToBackend(data.userBySupabaseId);
        set({ user: backendUser, isLoading: false });
      } else {
        set({
          user: null,
          isLoading: false,
          error: "User not found in backend",
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },

  fetchUserById: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Use the existing PROFILE_QUERY to fetch the user
      const data = await graphqlRequest<ProfileQueryResult>(PROFILE_QUERY, {
        userId: userId,
        viewerId: null,
      });
      if (data.user) {
        const backendUser = mapGraphUserToBackend(data.user);
        set({ user: backendUser, isLoading: false });
      } else {
        set({
          user: null,
          isLoading: false,
          error: "User not found in backend",
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },

  syncWithSupabase: async (supabaseUser: any) => {
    set({ isLoading: true, error: null });
    try {
      // First try to fetch existing user
      await get().fetchUser(supabaseUser.id);

      // If user doesn't exist, create them
      if (!get().user) {
        console.log("Creating user in backend", supabaseUser);
        try {
          await get().createUser(supabaseUser as User);
        } catch (createError: any) {
          // If user already exists (409), just fetch them
          if (
            createError.message.includes("409") ||
            createError.message.includes("Conflict")
          ) {
            console.log("User already exists, fetching...");
            await get().fetchUser(supabaseUser.id);
          } else {
            throw createError;
          }
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Sync failed",
        isLoading: false,
      });
    }
  },

  fetchBalances: async (userId: string) => {
    set({ loadingBalances: true });
    try {
      const data = await graphqlRequest<ProfileQueryResult>(PROFILE_QUERY, {
        userId,
        viewerId: null,
      });

      if (data.user?.balances) {
        const balances: { [key: string]: number } = {
          dooler: data.user.balances.dooler || 0,
          usdc: data.user.balances.usdc || 0,
          bling: data.user.balances.bling || 0,
          sol: data.user.balances.sol || 0,
        };
        set({ balances, loadingBalances: false });
      } else {
        set({ balances: null, loadingBalances: false });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch balances",
        loadingBalances: false,
      });
    }
  },

  fetchProfileComposite: async (userId: string, viewerId?: string) => {
    set({
      profileCompositeLoading: true,
      profileCompositeError: null,
      profileUserId: userId,
    });

    try {
      const data = await graphqlRequest<ProfileQueryResult>(PROFILE_QUERY, {
        userId,
        viewerId,
      });

      if (!data.user) {
        throw new Error("User not found");
      }

      const normalizedUser = mapGraphUserToBackend(data.user);
      const tweets =
        data.user.tweets?.edges?.map((edge) =>
          normalizeTweet(mapGraphTweetNode(edge.node))
        ) ?? [];
      const balances = mapGraphBalances(data.user.balances);

      set({
        profileCompositeLoading: false,
        profileCompositeError: null,
        profileUser: normalizedUser,
        profileUserId: userId,
        profileTweets: tweets,
        balances,
        loadingBalances: false,
      });

      useTweetsStore.getState().setUserTweets(tweets);

      return { user: normalizedUser, tweets };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load profile";
      set({
        profileCompositeLoading: false,
        profileCompositeError: message,
        profileUser: null,
        profileUserId: null,
      });
      return null;
    }
  },

  adjustFollowersCount: (delta: number) => {
    const state = get();
    if (state.user) {
      set({
        user: {
          ...state.user,
          followers_count: state.user.followers_count + delta,
        },
      });
    }
  },

  adjustProfileFollowers: (delta: number) => {
    set((state) => {
      if (!state.profileUser) {
        return state;
      }
      return {
        profileUser: {
          ...state.profileUser,
          followers_count: state.profileUser.followers_count + delta,
        },
      };
    });
  },

  clearUser: () => {
    set({
      user: null,
      error: null,
      balances: null,
      profileUser: null,
      profileUserId: null,
      profileTweets: [],
    });
  },
}));
