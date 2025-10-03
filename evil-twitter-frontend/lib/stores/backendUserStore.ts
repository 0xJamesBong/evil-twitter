import { create } from "zustand";
import { apiService } from "../services/api";
import { API_BASE_URL } from "../services/api";
import { User } from "./authStore";

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
}

interface BackendUserState {
  user: BackendUser | null;
  isLoading: boolean;
  error: string | null;
}

interface BackendUserActions {
  createUser: (user: User) => Promise<void>;
  fetchUser: (supabaseId: string) => Promise<void>;
  syncWithSupabase: (supabaseUser: any) => Promise<void>;
  clearUser: () => void;
}

export const useBackendUserStore = create<
  BackendUserState & BackendUserActions
>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  createUser: async (user: User) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supabase_id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0],
          display_name:
            user.user_metadata?.display_name || user.email?.split("@")[0],
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: null,
        }),
      });

      if (response.ok) {
        const newUser = await response.json();
        set({ user: newUser, isLoading: false });
      } else if (response.status === 409) {
        // User already exists, fetch them instead
        console.log("User already exists, fetching...");
        await get().fetchUser(user.id);
      } else {
        const errorText = await response.text();
        throw new Error(
          `Failed to create user: ${response.status} ${errorText}`
        );
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },
  fetchUser: async (supabaseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${API_BASE_URL}/users?supabase_id=${encodeURIComponent(supabaseId)}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          set({
            user: null,
            isLoading: false,
            error: "User not found in backend",
          });
          return;
        }
        throw new Error(`Failed to fetch backend user: ${response.status}`);
      }

      const data = await response.json();
      const users = data.users || [];

      if (users.length > 0) {
        set({ user: users[0], isLoading: false });
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

  clearUser: () => {
    set({ user: null, error: null });
  },
}));
