import { create } from "zustand";
import { API_BASE_URL } from "../services/api";

export interface CreateWeaponRequest {
  name: string;
  description: string;
  image_url: string;
  damage: number;
}

export interface Weapon {
  id: { $oid: string };
  owner_id: string;
  name: string;
  description: string;
  image_url: string;
  damage: number;
  health: number;
  max_health: number;
  degrade_per_use: number;
}

interface WeaponsState {
  weapons: Weapon[];
  isLoading: boolean;
  error: string | null;

  createWeapon: (userId: string, weapon: CreateWeaponRequest) => Promise<void>;
  fetchUserWeapons: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useWeaponsStore = create<WeaponsState>((set) => ({
  weapons: [],
  isLoading: false,
  error: null,

  createWeapon: async (userId: string, weapon: CreateWeaponRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/weapons/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weapon),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create weapon");
      }

      const newWeapon = await response.json();
      set((state) => ({
        weapons: [...state.weapons, newWeapon],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  fetchUserWeapons: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Note: This endpoint doesn't exist yet in backend
      // For now, just clear the loading state
      set({ weapons: [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
