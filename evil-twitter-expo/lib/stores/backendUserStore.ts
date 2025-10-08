import { create } from "zustand";
import { api } from "../services/api";

export interface BackendUser {
  _id: { $oid: string };
  supabase_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  dollar_rate: number;
  weapon_ids: string[];
  created_at: string;
  updated_at: string;
}

interface BackendUserState {
  user: BackendUser | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchUser: (supabaseId: string) => Promise<void>;
  createUser: (userData: Partial<BackendUser>) => Promise<void>;
  updateUser: (updates: Partial<BackendUser>) => void;
  clearError: () => void;
}

export const useBackendUserStore = create<BackendUserState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  fetchUser: async (supabaseId: string) => {
    set({ loading: true, error: null });

    try {
      const user = await api.getUser(supabaseId);
      set({ user, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch user";
      set({ error: errorMessage, loading: false });
    }
  },

  createUser: async (userData: Partial<BackendUser>) => {
    set({ loading: true, error: null });

    try {
      const user = await api.createUser(userData);
      set({ user, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      set({ error: errorMessage, loading: false });
    }
  },

  updateUser: (updates: Partial<BackendUser>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
