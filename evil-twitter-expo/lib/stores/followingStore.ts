import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

interface FollowingUser {
  _id: { $oid: string };
  display_name: string;
  username: string;
  email: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  created_at: { $date: { $numberLong: string } };
}

interface FollowingState {
  following: FollowingUser[];
  isLoading: boolean;
  error: string | null;
}

interface FollowingActions {
  fetchFollowing: (userId: string) => Promise<void>;
  clearFollowing: () => void;
  clearError: () => void;
}

export const useFollowingStore = create<FollowingState & FollowingActions>(
  (set, get) => ({
    following: [],
    isLoading: false,
    error: null,

    fetchFollowing: async (userId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${userId}/following`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch following list");
        }

        const data = await response.json();
        set({
          following: data.following || [],
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
          isLoading: false,
        });
      }
    },

    clearFollowing: () => {
      set({ following: [] });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
