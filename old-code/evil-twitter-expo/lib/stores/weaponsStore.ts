import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

export type ToolType = "Weapon" | "Support";
export type ToolTarget = "Tweet" | "User";

export interface Weapon {
  _id: { $oid: string };
  owner_id: string;
  name: string;
  description: string;
  image_url: string;
  tool_type: ToolType;
  tool_target: ToolTarget;
  impact: number;
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
      const response = await fetch(`${API_BASE_URL}/users/${userId}/assets`);
      if (!response.ok) throw new Error("Failed to fetch user assets");
      const weapons = await response.json();
      set({ weapons, loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch assets";
      set({ error: errorMessage, loading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
