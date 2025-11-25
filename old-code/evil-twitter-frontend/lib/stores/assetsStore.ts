import { create } from "zustand";
import { API_BASE_URL } from "../services/api";

export type ToolType = "Weapon" | "Support";
export type ToolTarget = "Tweet" | "User";

export interface Asset {
  id?: { $oid: string };
  owner_id: string;
  item?: {
    name: string;
    description: string;
    image_url: string;
    item_type_metadata?: {
      type: string;
      data: {
        impact: number;
        health: number;
        max_health: number;
        degrade_per_use: number;
        tool_type: ToolType;
        tool_target: ToolTarget;
      };
    };
  };
  tradeable: boolean;
}

interface AssetsState {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;

  fetchUserAssets: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useAssetsStore = create<AssetsState>((set) => ({
  assets: [],
  isLoading: false,
  error: null,

  fetchUserAssets: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/assets`);
      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }

      const assets = await response.json();
      set({ assets, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
