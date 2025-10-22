import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

interface FollowUser {
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

interface FollowState {
  // Followers data
  followers: FollowUser[];
  followersLoading: boolean;
  followersError: string | null;

  // Following data
  following: FollowUser[];
  followingLoading: boolean;
  followingError: string | null;

  // Follow status for current user viewing another user
  isFollowing: boolean;
  followStatusLoading: boolean;
  followStatusError: string | null;
}

interface FollowActions {
  // Followers actions
  fetchFollowers: (userId: string) => Promise<void>;
  clearFollowers: () => void;
  clearFollowersError: () => void;

  // Following actions
  fetchFollowing: (userId: string) => Promise<void>;
  clearFollowing: () => void;
  clearFollowingError: () => void;

  // Follow status actions
  checkFollowStatus: (
    targetUserId: string,
    currentUserId: string
  ) => Promise<void>;
  followUser: (targetUserId: string, currentUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string, currentUserId: string) => Promise<void>;
  clearFollowStatus: () => void;
  clearFollowStatusError: () => void;
}

export const useFollowStore = create<FollowState & FollowActions>(
  (set, get) => ({
    // State
    followers: [],
    followersLoading: false,
    followersError: null,
    following: [],
    followingLoading: false,
    followingError: null,
    isFollowing: false,
    followStatusLoading: false,
    followStatusError: null,

    // Followers actions
    fetchFollowers: async (userId: string) => {
      set({ followersLoading: true, followersError: null });
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
          followersLoading: false,
          followersError: null,
        });
      } catch (error) {
        console.error("Followers fetch error:", error);
        set({
          followersError:
            error instanceof Error
              ? error.message
              : "Failed to fetch followers",
          followersLoading: false,
        });
      }
    },

    clearFollowers: () => {
      set({ followers: [], followersError: null });
    },

    clearFollowersError: () => {
      set({ followersError: null });
    },

    // Following actions
    fetchFollowing: async (userId: string) => {
      set({ followingLoading: true, followingError: null });
      try {
        console.log("Fetching following for userId:", userId);
        const response = await fetch(
          `${API_BASE_URL}/users/${userId}/following`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch following list");
        }

        const data = await response.json();
        console.log("Following API response:", data);
        set({
          following: data.following || [],
          followingLoading: false,
          followingError: null,
        });
      } catch (error) {
        console.error("Following fetch error:", error);
        set({
          followingError:
            error instanceof Error
              ? error.message
              : "Failed to fetch following",
          followingLoading: false,
        });
      }
    },

    clearFollowing: () => {
      set({ following: [], followingError: null });
    },

    clearFollowingError: () => {
      set({ followingError: null });
    },

    // Follow status actions
    checkFollowStatus: async (targetUserId: string, currentUserId: string) => {
      set({ followStatusLoading: true, followStatusError: null });
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${targetUserId}/follow-status?follower_id=${currentUserId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to check follow status");
        }

        const data = await response.json();
        set({
          isFollowing: data.is_following || false,
          followStatusLoading: false,
          followStatusError: null,
        });
      } catch (error) {
        console.error("Follow status check error:", error);
        set({
          followStatusError:
            error instanceof Error
              ? error.message
              : "Failed to check follow status",
          followStatusLoading: false,
        });
      }
    },

    followUser: async (targetUserId: string, currentUserId: string) => {
      // Optimistically update the state immediately
      set({ isFollowing: true });

      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${targetUserId}/follow`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              following_id: currentUserId,
            }),
          }
        );

        if (!response.ok) {
          // Revert the optimistic update on error
          set({ isFollowing: false });
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to follow user");
        }

        // Confirm the state with server response
        const data = await response.json();
        set({ isFollowing: data.is_following || true });
      } catch (error) {
        console.error("Follow user error:", error);
        // State is already reverted above if needed
        throw error;
      }
    },

    unfollowUser: async (targetUserId: string, currentUserId: string) => {
      // Optimistically update the state immediately
      set({ isFollowing: false });

      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${targetUserId}/follow`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              following_id: currentUserId,
            }),
          }
        );

        if (!response.ok) {
          // Revert the optimistic update on error
          set({ isFollowing: true });
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to unfollow user");
        }

        // Confirm the state with server response
        const data = await response.json();
        set({ isFollowing: data.is_following || false });
      } catch (error) {
        console.error("Unfollow user error:", error);
        // State is already reverted above if needed
        throw error;
      }
    },

    clearFollowStatus: () => {
      set({
        isFollowing: false,
        followStatusError: null,
        followStatusLoading: false,
      });
    },

    clearFollowStatusError: () => {
      set({ followStatusError: null });
    },
  })
);
