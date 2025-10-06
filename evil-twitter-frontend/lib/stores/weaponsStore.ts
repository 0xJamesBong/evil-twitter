import { create } from "zustand";
import { API_BASE_URL } from "../services/api";

export interface CreateWeaponRequest {
  name: string;
  description: string;
  image_url: string; // This will be an emoji
  damage: number;
}

export interface Weapon {
  _id: { $oid: string };
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
      console.log("createWeapon", weapon.name, userId, weapon.image_url);
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
      const response = await fetch(`${API_BASE_URL}/users/${userId}/weapons`);
      console.log("fetchUserWeapons:", userId);
      console.log("fetchUserWeapons | response", response);
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
