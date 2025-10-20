import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

export interface ProfileUser {
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
  weapon_ids: { $oid: string }[];
}

interface ProfileState {
  // Current profile being viewed
  profileUser: ProfileUser | null;
  isLoading: boolean;
  error: string | null;
}

interface ProfileActions {
  fetchProfile: (userId: string) => Promise<void>;
  clearProfile: () => void;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState & ProfileActions>(
  (set, get) => ({
    // State
    profileUser: null,
    isLoading: false,
    error: null,

    // Actions
    fetchProfile: async (userId: string) => {
      set({ isLoading: true, error: null });
      try {
        console.log("Fetching profile for userId:", userId);
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", response.status, errorText);
          throw new Error(
            `Failed to fetch profile: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        console.log("Profile API response:", data);
        set({
          profileUser: data, // The API returns the user directly, not wrapped in a 'user' property
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Profile fetch error:", error);
        set({
          error:
            error instanceof Error ? error.message : "Failed to fetch profile",
          isLoading: false,
        });
      }
    },

    clearProfile: () => {
      set({ profileUser: null, error: null });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
