import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

export type ObjectIdString = string;

export interface FollowUser {
  _id: { $oid: ObjectIdString };
  supabase_id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  created_at?: { $date: { $numberLong: string } };
  followers_count?: number;
  following_count?: number;
}

export interface FollowListEntry {
  user: FollowUser;
  isFollowedByViewer: boolean;
  isViewer: boolean;
}

type FollowActionMap = Record<string, boolean>;

interface FollowState {
  followers: FollowListEntry[];
  followersLoading: boolean;
  followersError: string | null;
  followersUserId: string | null;
  followersViewerId: string | null;

  following: FollowListEntry[];
  followingLoading: boolean;
  followingError: string | null;
  followingUserId: string | null;
  followingViewerId: string | null;

  isFollowing: boolean;
  followStatusTargetId: string | null;
  followStatusLoading: boolean;
  followStatusError: string | null;

  followActionLoading: FollowActionMap;
}

interface FollowActions {
  fetchFollowers: (userId: string, viewerId?: string) => Promise<void>;
  clearFollowers: () => void;
  clearFollowersError: () => void;

  fetchFollowing: (userId: string, viewerId?: string) => Promise<void>;
  clearFollowing: () => void;
  clearFollowingError: () => void;

  checkFollowStatus: (targetUserId: string, currentUserId: string) => Promise<void>;
  followUser: (targetUserId: string, currentUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string, currentUserId: string) => Promise<void>;
  clearFollowStatus: () => void;
  clearFollowStatusError: () => void;
}

const buildUrl = (base: string, params: Record<string, string | undefined>) => {
  const url = new URL(base, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const normalizeEntry = (raw: any): FollowListEntry => {
  const user = (raw?.user ?? {}) as FollowUser;
  return {
    user,
    isFollowedByViewer: Boolean(raw?.is_followed_by_viewer),
    isViewer: Boolean(raw?.is_viewer),
  };
};

export const useFollowStore = create<FollowState & FollowActions>((set, get) => ({
  followers: [],
  followersLoading: false,
  followersError: null,
  followersUserId: null,
  followersViewerId: null,

  following: [],
  followingLoading: false,
  followingError: null,
  followingUserId: null,
  followingViewerId: null,

  isFollowing: false,
  followStatusTargetId: null,
  followStatusLoading: false,
  followStatusError: null,

  followActionLoading: {},

  fetchFollowers: async (userId: string, viewerId?: string) => {
    set({
      followersLoading: true,
      followersError: null,
      followersUserId: userId,
      followersViewerId: viewerId ?? null,
    });

    try {
      const path = buildUrl(`${API_BASE_URL}/users/${userId}/followers`, {
        viewer_id: viewerId,
      });
      const response = await fetch(path);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch followers list");
      }

      const data = await response.json();
      const entries = Array.isArray(data.followers)
        ? data.followers.map(normalizeEntry)
        : [];

      set({
        followers: entries,
        followersLoading: false,
        followersError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch followers";
      set({
        followersError: message,
        followersLoading: false,
      });
    }
  },

  clearFollowers: () => {
    set({
      followers: [],
      followersError: null,
      followersUserId: null,
      followersViewerId: null,
    });
  },

  clearFollowersError: () => {
    set({ followersError: null });
  },

  fetchFollowing: async (userId: string, viewerId?: string) => {
    set({
      followingLoading: true,
      followingError: null,
      followingUserId: userId,
      followingViewerId: viewerId ?? null,
    });

    try {
      const path = buildUrl(`${API_BASE_URL}/users/${userId}/following`, {
        viewer_id: viewerId,
      });
      const response = await fetch(path);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch following list");
      }

      const data = await response.json();
      const entries = Array.isArray(data.following)
        ? data.following.map(normalizeEntry)
        : [];

      set({
        following: entries,
        followingLoading: false,
        followingError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch following";
      set({
        followingError: message,
        followingLoading: false,
      });
    }
  },

  clearFollowing: () => {
    set({
      following: [],
      followingError: null,
      followingUserId: null,
      followingViewerId: null,
    });
  },

  clearFollowingError: () => {
    set({ followingError: null });
  },

  checkFollowStatus: async (targetUserId: string, currentUserId: string) => {
    set({
      followStatusLoading: true,
      followStatusError: null,
      followStatusTargetId: targetUserId,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/follow-status?follower_id=${currentUserId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to check follow status");
      }

      const data = await response.json();
      set({
        isFollowing: Boolean(data.is_following),
        followStatusLoading: false,
        followStatusError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to check follow status";
      set({
        followStatusError: message,
        followStatusLoading: false,
      });
    }
  },

  followUser: async (targetUserId: string, currentUserId: string) => {
    const prevIsFollowing = get().isFollowing;
    const prevTargetId = get().followStatusTargetId;

    set((state) => ({
      isFollowing:
        state.followStatusTargetId === targetUserId ? true : state.isFollowing,
      followActionLoading: {
        ...state.followActionLoading,
        [targetUserId]: true,
      },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: currentUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to follow user");
      }

      const data = await response.json();

      set((state) => {
        const nextLoading = { ...state.followActionLoading };
        delete nextLoading[targetUserId];
        return {
          isFollowing:
            state.followStatusTargetId === targetUserId
              ? Boolean(data.is_following ?? true)
              : state.isFollowing,
          followActionLoading: nextLoading,
        };
      });

      const snapshot = get();
      const tasks: Promise<void>[] = [];
      const enqueue = (key: string, task: () => Promise<void>) => {
        tasks.push(
          task().catch((err) => {
            console.warn(`Failed to refresh ${key}`, err);
          })
        );
      };

      if (snapshot.followersUserId === targetUserId) {
        enqueue("followers-target", () =>
          get().fetchFollowers(
            targetUserId,
            snapshot.followersViewerId ?? undefined
          )
        );
      }
      if (snapshot.followersUserId === currentUserId) {
        enqueue("followers-viewer", () =>
          get().fetchFollowers(
            currentUserId,
            snapshot.followersViewerId ?? undefined
          )
        );
      }
      if (snapshot.followingUserId === targetUserId) {
        enqueue("following-target", () =>
          get().fetchFollowing(
            targetUserId,
            snapshot.followingViewerId ?? undefined
          )
        );
      }
      if (snapshot.followingUserId === currentUserId) {
        enqueue("following-viewer", () =>
          get().fetchFollowing(
            currentUserId,
            snapshot.followingViewerId ?? undefined
          )
        );
      }
      if (tasks.length) {
        await Promise.all(tasks);
      }
    } catch (error) {
      set((state) => {
        const nextLoading = { ...state.followActionLoading };
        delete nextLoading[targetUserId];
        return {
          isFollowing:
            prevTargetId === targetUserId ? prevIsFollowing : state.isFollowing,
          followActionLoading: nextLoading,
        };
      });
      throw error;
    }
  },

  unfollowUser: async (targetUserId: string, currentUserId: string) => {
    const prevIsFollowing = get().isFollowing;
    const prevTargetId = get().followStatusTargetId;

    set((state) => ({
      isFollowing:
        state.followStatusTargetId === targetUserId ? false : state.isFollowing,
      followActionLoading: {
        ...state.followActionLoading,
        [targetUserId]: true,
      },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: currentUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to unfollow user");
      }

      const data = await response.json();

      set((state) => {
        const nextLoading = { ...state.followActionLoading };
        delete nextLoading[targetUserId];
        return {
          isFollowing:
            state.followStatusTargetId === targetUserId
              ? Boolean(data.is_following ?? false)
              : state.isFollowing,
          followActionLoading: nextLoading,
        };
      });

      const snapshot = get();
      const tasks: Promise<void>[] = [];
      const enqueue = (key: string, task: () => Promise<void>) => {
        tasks.push(
          task().catch((err) => {
            console.warn(`Failed to refresh ${key}`, err);
          })
        );
      };

      if (snapshot.followersUserId === targetUserId) {
        enqueue("followers-target", () =>
          get().fetchFollowers(
            targetUserId,
            snapshot.followersViewerId ?? undefined
          )
        );
      }
      if (snapshot.followersUserId === currentUserId) {
        enqueue("followers-viewer", () =>
          get().fetchFollowers(
            currentUserId,
            snapshot.followersViewerId ?? undefined
          )
        );
      }
      if (snapshot.followingUserId === targetUserId) {
        enqueue("following-target", () =>
          get().fetchFollowing(
            targetUserId,
            snapshot.followingViewerId ?? undefined
          )
        );
      }
      if (snapshot.followingUserId === currentUserId) {
        enqueue("following-viewer", () =>
          get().fetchFollowing(
            currentUserId,
            snapshot.followingViewerId ?? undefined
          )
        );
      }
      if (tasks.length) {
        await Promise.all(tasks);
      }
    } catch (error) {
      set((state) => {
        const nextLoading = { ...state.followActionLoading };
        delete nextLoading[targetUserId];
        return {
          isFollowing:
            prevTargetId === targetUserId ? prevIsFollowing : state.isFollowing,
          followActionLoading: nextLoading,
        };
      });
      throw error;
    }
  },

  clearFollowStatus: () => {
    set({
      isFollowing: false,
      followStatusError: null,
      followStatusLoading: false,
      followStatusTargetId: null,
    });
  },

  clearFollowStatusError: () => {
    set({ followStatusError: null });
  },
}));
