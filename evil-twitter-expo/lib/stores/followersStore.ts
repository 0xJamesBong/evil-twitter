import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

interface FollowerUser {
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
}

interface FollowersState {
  followers: FollowerUser[];
  isLoading: boolean;
  error: string | null;
}

interface FollowersActions {
  fetchFollowers: (userId: string) => Promise<void>;
  clearFollowers: () => void;
  clearError: () => void;
}

export const useFollowersStore = create<FollowersState & FollowersActions>(
  (set, get) => ({
    // State
    followers: [],
    isLoading: false,
    error: null,

    // Actions
    fetchFollowers: async (userId: string) => {
      set({ isLoading: true, error: null });
      try {
        console.log("Fetching followers for userId:", userId);
        const response = await fetch(
          `${API_BASE_URL}/users/${userId}/followers`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch followers list");
        }

        const data = await response.json();
        console.log("Followers API response:", data);
        set({
          followers: data.followers || [],
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Followers fetch error:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch followers",
          isLoading: false,
        });
      }
    },

    clearFollowers: () => {
      set({ followers: [], error: null });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
