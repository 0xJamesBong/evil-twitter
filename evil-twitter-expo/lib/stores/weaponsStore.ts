import { create } from "zustand";
import { api } from "../services/api";

export interface Weapon {
  _id: { $oid: string };
  owner_id: string;
  name: string;
  description: string;
  image_url: string; // Emoji
  damage: number;
  health: number;
  max_health: number;
  degrade_per_use: number;
}

interface WeaponsState {
  weapons: Weapon[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchUserWeapons: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useWeaponsStore = create<WeaponsState>((set, get) => ({
  weapons: [],
  loading: false,
  error: null,

  fetchUserWeapons: async (userId: string) => {
    set({ loading: true, error: null });

    try {
      const weapons = await api.getUserWeapons(userId);
      set({ weapons, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch weapons";
      set({ error: errorMessage, loading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
