import { create } from "zustand";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

interface FollowState {
  isFollowing: boolean;
  isLoading: boolean;
  error: string | null;
}

interface FollowActions {
  followUser: (userId: string, followerId: string) => Promise<void>;
  unfollowUser: (userId: string, followerId: string) => Promise<void>;
  checkFollowStatus: (userId: string, followerId: string) => Promise<void>;
  setFollowStatus: (isFollowing: boolean) => void;
  clearError: () => void;
}

export const useFollowStore = create<FollowState & FollowActions>(
  (set, get) => ({
    isFollowing: false,
    isLoading: false,
    error: null,

    followUser: async (userId: string, followerId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            following_id: followerId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to follow user");
        }

        const data = await response.json();
        set({
          isFollowing: data.is_following,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
          isLoading: false,
        });
      }
    },

    unfollowUser: async (userId: string, followerId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            following_id: followerId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to unfollow user");
        }

        const data = await response.json();
        set({
          isFollowing: data.is_following,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
          isLoading: false,
        });
      }
    },

    checkFollowStatus: async (userId: string, followerId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${userId}/follow-status?follower_id=${followerId}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to check follow status");
        }

        const data = await response.json();
        set({
          isFollowing: data.is_following,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
          isLoading: false,
        });
      }
    },

    setFollowStatus: (isFollowing: boolean) => {
      set({ isFollowing });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
