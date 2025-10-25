import { create } from "zustand";
import { API_BASE_URL } from "../services/api";

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
  isLoading: boolean;
  error: string | null;

  fetchUserWeapons: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useWeaponsStore = create<WeaponsState>((set) => ({
  weapons: [],
  isLoading: false,
  error: null,

  fetchUserWeapons: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/weapons`);
      if (!response.ok) {
        throw new Error("Failed to fetch weapons");
      }

      const weapons = await response.json();
      set({ weapons, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
