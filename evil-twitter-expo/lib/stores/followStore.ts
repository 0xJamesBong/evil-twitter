import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

type ObjectIdString = string;

interface FollowUser {
  _id: { $oid: ObjectIdString };
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

type IntimateRequestStatus = "pending" | "approved" | "rejected";

interface IntimateFollowRequestEntry {
  user: FollowUser;
  requested_at: any;
  status: IntimateRequestStatus;
}

interface FollowState {
  followers: FollowUser[];
  followersLoading: boolean;
  followersError: string | null;

  following: FollowUser[];
  followingLoading: boolean;
  followingError: string | null;

  isFollowing: boolean;
  followStatusLoading: boolean;
  followStatusError: string | null;

  isIntimateFollower: boolean;
  intimateRequestStatus: IntimateRequestStatus | null;
  intimateStatusLoading: boolean;
  intimateStatusError: string | null;

  intimateFollowers: FollowUser[];
  intimateFollowersLoading: boolean;
  intimateFollowersError: string | null;

  intimateRequests: IntimateFollowRequestEntry[];
  intimateRequestsLoading: boolean;
  intimateRequestsError: string | null;
}

interface FollowActions {
  fetchFollowers: (userId: string) => Promise<void>;
  clearFollowers: () => void;
  clearFollowersError: () => void;

  fetchFollowing: (userId: string) => Promise<void>;
  clearFollowing: () => void;
  clearFollowingError: () => void;

  checkFollowStatus: (targetUserId: string, currentUserId: string) => Promise<void>;
  followUser: (targetUserId: string, currentUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string, currentUserId: string) => Promise<void>;
  clearFollowStatus: () => void;
  clearFollowStatusError: () => void;

  checkIntimateFollowStatus: (targetUserId: string, currentUserId: string) => Promise<void>;
  requestIntimateFollow: (targetUserId: string, currentUserId: string) => Promise<void>;
  approveIntimateFollower: (targetUserId: string, requesterId: string) => Promise<void>;
  rejectIntimateFollower: (targetUserId: string, requesterId: string) => Promise<void>;
  ejectIntimateFollower: (targetUserId: string, followerId: string) => Promise<void>;
  fetchIntimateFollowers: (userId: string) => Promise<void>;
  fetchIntimateRequests: (userId: string) => Promise<void>;
  clearIntimateState: () => void;
  clearIntimateErrors: () => void;
}

const getAuthHeaders = async (includeJson: boolean = true): Promise<Record<string, string>> => {
  const { supabase } = await import("../supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};

const normalizeRequestStatus = (value: unknown): IntimateRequestStatus | null => {
  if (typeof value !== "string") {
    return null;
  }
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return null;
};

export const useFollowStore = create<FollowState & FollowActions>((set, get) => ({
  followers: [],
  followersLoading: false,
  followersError: null,

  following: [],
  followingLoading: false,
  followingError: null,

  isFollowing: false,
  followStatusLoading: false,
  followStatusError: null,

  isIntimateFollower: false,
  intimateRequestStatus: null,
  intimateStatusLoading: false,
  intimateStatusError: null,

  intimateFollowers: [],
  intimateFollowersLoading: false,
  intimateFollowersError: null,

  intimateRequests: [],
  intimateRequestsLoading: false,
  intimateRequestsError: null,

  fetchFollowers: async (userId: string) => {
    set({ followersLoading: true, followersError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/followers`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch followers list");
      }
      const data = await response.json();
      set({
        followers: data.followers || [],
        followersLoading: false,
        followersError: null,
      });
    } catch (error) {
      set({
        followersError:
          error instanceof Error ? error.message : "Failed to fetch followers",
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

  fetchFollowing: async (userId: string) => {
    set({ followingLoading: true, followingError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/following`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch following list");
      }
      const data = await response.json();
      set({
        following: data.following || [],
        followingLoading: false,
        followingError: null,
      });
    } catch (error) {
      set({
        followingError:
          error instanceof Error ? error.message : "Failed to fetch following",
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

  checkFollowStatus: async (targetUserId: string, currentUserId: string) => {
    set({ followStatusLoading: true, followStatusError: null });
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/follow-status?follower_id=${currentUserId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
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
      set({
        followStatusError:
          error instanceof Error ? error.message : "Failed to check follow status",
        followStatusLoading: false,
      });
    }
  },

  followUser: async (targetUserId: string, currentUserId: string) => {
    set({ isFollowing: true });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: currentUserId }),
      });
      if (!response.ok) {
        set({ isFollowing: false });
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to follow user");
      }
      const data = await response.json();
      set({ isFollowing: data.is_following ?? true });
    } catch (error) {
      set({ isFollowing: false });
      throw error;
    }
  },

  unfollowUser: async (targetUserId: string, currentUserId: string) => {
    set({ isFollowing: false });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/follow`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: currentUserId }),
      });
      if (!response.ok) {
        set({ isFollowing: true });
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to unfollow user");
      }
      const data = await response.json();
      set({ isFollowing: data.is_following ?? false });
    } catch (error) {
      set({ isFollowing: true });
      throw error;
    }
  },

  clearFollowStatus: () => {
    set({
      isFollowing: false,
      followStatusError: null,
      followStatusLoading: false,
      isIntimateFollower: false,
      intimateRequestStatus: null,
      intimateStatusError: null,
      intimateStatusLoading: false,
    });
  },

  clearFollowStatusError: () => {
    set({ followStatusError: null });
  },

  checkIntimateFollowStatus: async (targetUserId: string, currentUserId: string) => {
    set({ intimateStatusLoading: true, intimateStatusError: null });
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/intimate-follow/status?follower_id=${currentUserId}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check intimate follow status");
      }
      const data = await response.json();
      const status = normalizeRequestStatus(data.request_status);
      set({
        isIntimateFollower: Boolean(data.is_intimate_follower),
        intimateRequestStatus: status ?? (data.has_pending_request ? "pending" : null),
        intimateStatusLoading: false,
        intimateStatusError: null,
      });
    } catch (error) {
      set({
        intimateStatusError:
          error instanceof Error
            ? error.message
            : "Failed to check intimate follow status",
        intimateStatusLoading: false,
      });
    }
  },

  requestIntimateFollow: async (targetUserId: string, currentUserId: string) => {
    set({ intimateStatusLoading: true, intimateStatusError: null });
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/intimate-follow/request`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ requester_id: currentUserId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to request intimate follow");
      }
      const data = await response.json();
      const status = normalizeRequestStatus(data.relationship_status) ?? "pending";
      set({
        isIntimateFollower: Boolean(data.is_intimate_follower),
        intimateRequestStatus: status,
        intimateStatusLoading: false,
        intimateStatusError: null,
      });
    } catch (error) {
      set({
        intimateStatusError:
          error instanceof Error
            ? error.message
            : "Failed to send intimate follow request",
        intimateStatusLoading: false,
      });
      throw error;
    }
  },

  approveIntimateFollower: async (targetUserId: string, requesterId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/intimate-follow/approve`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ requester_id: requesterId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve intimate follower");
      }
      await Promise.all([
        get().fetchIntimateFollowers(targetUserId),
        get().fetchIntimateRequests(targetUserId),
      ]);
    } catch (error) {
      throw error;
    }
  },

  rejectIntimateFollower: async (targetUserId: string, requesterId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/intimate-follow/reject`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ requester_id: requesterId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject intimate follower");
      }
      await get().fetchIntimateRequests(targetUserId);
    } catch (error) {
      throw error;
    }
  },

  ejectIntimateFollower: async (targetUserId: string, followerId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/${targetUserId}/intimate-follow`,
        {
          method: "DELETE",
          headers,
          body: JSON.stringify({ requester_id: followerId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to eject intimate follower");
      }
      await Promise.all([
        get().fetchIntimateFollowers(targetUserId),
        get().fetchIntimateRequests(targetUserId),
      ]);
    } catch (error) {
      throw error;
    }
  },

  fetchIntimateFollowers: async (userId: string) => {
    set({ intimateFollowersLoading: true, intimateFollowersError: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/intimate-followers`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch intimate followers");
      }
      const data = await response.json();
      set({
        intimateFollowers: data.followers || [],
        intimateFollowersLoading: false,
        intimateFollowersError: null,
      });
    } catch (error) {
      set({
        intimateFollowersError:
          error instanceof Error
            ? error.message
            : "Failed to fetch intimate followers",
        intimateFollowersLoading: false,
      });
    }
  },

  fetchIntimateRequests: async (userId: string) => {
    set({ intimateRequestsLoading: true, intimateRequestsError: null });
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}/intimate-follow/requests`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch intimate follow requests");
      }
      const data = await response.json();
      set({
        intimateRequests: data.requests || [],
        intimateRequestsLoading: false,
        intimateRequestsError: null,
      });
    } catch (error) {
      set({
        intimateRequestsError:
          error instanceof Error
            ? error.message
            : "Failed to fetch intimate follow requests",
        intimateRequestsLoading: false,
      });
    }
  },

  clearIntimateState: () => {
    set({
      isIntimateFollower: false,
      intimateRequestStatus: null,
      intimateStatusLoading: false,
      intimateStatusError: null,
      intimateFollowers: [],
      intimateFollowersError: null,
      intimateFollowersLoading: false,
      intimateRequests: [],
      intimateRequestsError: null,
      intimateRequestsLoading: false,
    });
  },

  clearIntimateErrors: () => {
    set({
      intimateStatusError: null,
      intimateFollowersError: null,
      intimateRequestsError: null,
    });
  },
}));
