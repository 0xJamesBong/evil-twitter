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

interface FollowStatusCacheEntry {
  isFollowing: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface FollowListCacheEntry {
  data: FollowListEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
  viewerId: string | null;
}

interface FollowState {
  statusCache: Record<string, FollowStatusCacheEntry>;
  followersCache: Record<string, FollowListCacheEntry>;
  followingCache: Record<string, FollowListCacheEntry>;
}

interface FollowActions {
  getFollowStatus: (targetUserId: string) => FollowStatusCacheEntry | undefined;
  checkFollowStatus: (targetUserId: string, viewerId: string) => Promise<void>;
  followUser: (targetUserId: string, viewerId: string) => Promise<void>;
  unfollowUser: (targetUserId: string, viewerId: string) => Promise<void>;

  getFollowers: (userId: string) => FollowListCacheEntry | undefined;
  fetchFollowers: (userId: string, viewerId?: string) => Promise<void>;

  getFollowing: (userId: string) => FollowListCacheEntry | undefined;
  fetchFollowing: (userId: string, viewerId?: string) => Promise<void>;

  clearCaches: () => void;
}

const buildUrl = (path: string, params: Record<string, string | undefined>) => {
  const url = new URL(path, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
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

const now = () => Date.now();

const updateListCache = (
  cache: Record<string, FollowListCacheEntry>,
  key: string,
  userId: string,
  isFollowed: boolean
) => {
  const entry = cache[key];
  if (!entry) return cache;
  return {
    ...cache,
    [key]: {
      ...entry,
      data: entry.data.map((item) =>
        item.user._id.$oid === userId
          ? { ...item, isFollowedByViewer: isFollowed }
          : item
      ),
    },
  };
};

export const useFollowStore = create<FollowState & FollowActions>((set, get) => ({
  statusCache: {},
  followersCache: {},
  followingCache: {},

  getFollowStatus: (targetUserId) => get().statusCache[targetUserId],

  checkFollowStatus: async (targetUserId, viewerId) => {
    set((state) => ({
      statusCache: {
        ...state.statusCache,
        [targetUserId]: {
          ...(state.statusCache[targetUserId] ?? {
            isFollowing: false,
            error: null,
            lastUpdated: 0,
          }),
          loading: true,
          error: null,
        },
      },
    }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/follow-status?follower_id=${viewerId}`
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch follow status");
      }

      const data = await response.json();

      set((state) => ({
        statusCache: {
          ...state.statusCache,
          [targetUserId]: {
            isFollowing: Boolean(data.is_following),
            loading: false,
            error: null,
            lastUpdated: now(),
          },
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch follow status";
      set((state) => ({
        statusCache: {
          ...state.statusCache,
          [targetUserId]: {
            ...(state.statusCache[targetUserId] ?? {
              isFollowing: false,
              lastUpdated: 0,
            }),
            loading: false,
            error: message,
          },
        },
      }));
    }
  },

  followUser: async (targetUserId, viewerId) => {
    const prev = get().statusCache[targetUserId];
    set((state) => ({
      statusCache: {
        ...state.statusCache,
        [targetUserId]: {
          isFollowing: true,
          loading: false,
          error: null,
          lastUpdated: now(),
        },
      },
      followersCache: updateListCache(state.followersCache, targetUserId, viewerId, true),
      followingCache: updateListCache(state.followingCache, viewerId, targetUserId, true),
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: viewerId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to follow user");
      }
    } catch (error) {
      set((state) => ({
        statusCache: {
          ...state.statusCache,
          [targetUserId]: prev ?? {
            isFollowing: false,
            loading: false,
            error: error instanceof Error ? error.message : "Failed to follow user",
            lastUpdated: now(),
          },
        },
      }));
      throw error;
    }
  },

  unfollowUser: async (targetUserId, viewerId) => {
    const prev = get().statusCache[targetUserId];
    set((state) => ({
      statusCache: {
        ...state.statusCache,
        [targetUserId]: {
          isFollowing: false,
          loading: false,
          error: null,
          lastUpdated: now(),
        },
      },
      followersCache: updateListCache(state.followersCache, targetUserId, viewerId, false),
      followingCache: updateListCache(state.followingCache, viewerId, targetUserId, false),
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: viewerId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to unfollow user");
      }
    } catch (error) {
      set((state) => ({
        statusCache: {
          ...state.statusCache,
          [targetUserId]: prev ?? {
            isFollowing: true,
            loading: false,
            error: error instanceof Error ? error.message : "Failed to unfollow user",
            lastUpdated: now(),
          },
        },
      }));
      throw error;
    }
  },

  getFollowers: (userId) => get().followersCache[userId],

  fetchFollowers: async (userId, viewerId) => {
    set((state) => ({
      followersCache: {
        ...state.followersCache,
        [userId]: {
          ...(state.followersCache[userId] ?? {
            data: [],
            error: null,
            lastUpdated: 0,
            viewerId: viewerId ?? null,
          }),
          loading: true,
          error: null,
        },
      },
    }));

    try {
      const response = await fetch(
        buildUrl(`${API_BASE_URL}/users/${userId}/followers`, {
          viewer_id: viewerId,
        })
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch followers list");
      }

      const data = await response.json();
      const entries = Array.isArray(data.followers)
        ? data.followers.map(normalizeEntry)
        : [];

      set((state) => ({
        followersCache: {
          ...state.followersCache,
          [userId]: {
            data: entries,
            loading: false,
            error: null,
            lastUpdated: now(),
            viewerId: viewerId ?? null,
          },
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch followers list";
      set((state) => ({
        followersCache: {
          ...state.followersCache,
          [userId]: {
            ...(state.followersCache[userId] ?? {
              data: [],
              lastUpdated: 0,
              viewerId: viewerId ?? null,
            }),
            loading: false,
            error: message,
          },
        },
      }));
    }
  },

  getFollowing: (userId) => get().followingCache[userId],

  fetchFollowing: async (userId, viewerId) => {
    set((state) => ({
      followingCache: {
        ...state.followingCache,
        [userId]: {
          ...(state.followingCache[userId] ?? {
            data: [],
            error: null,
            lastUpdated: 0,
            viewerId: viewerId ?? null,
          }),
          loading: true,
          error: null,
        },
      },
    }));

    try {
      const response = await fetch(
        buildUrl(`${API_BASE_URL}/users/${userId}/following`, {
          viewer_id: viewerId,
        })
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch following list");
      }

      const data = await response.json();
      const entries = Array.isArray(data.following)
        ? data.following.map(normalizeEntry)
        : [];

      set((state) => ({
        followingCache: {
          ...state.followingCache,
          [userId]: {
            data: entries,
            loading: false,
            error: null,
            lastUpdated: now(),
            viewerId: viewerId ?? null,
          },
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch following list";
      set((state) => ({
        followingCache: {
          ...state.followingCache,
          [userId]: {
            ...(state.followingCache[userId] ?? {
              data: [],
              lastUpdated: 0,
              viewerId: viewerId ?? null,
            }),
            loading: false,
            error: message,
          },
        },
      }));
    }
  },

  clearCaches: () =>
    set({
      statusCache: {},
      followersCache: {},
      followingCache: {},
    }),
}));
