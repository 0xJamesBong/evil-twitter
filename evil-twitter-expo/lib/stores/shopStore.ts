import { create } from "zustand";
import { ToolTarget, ToolType } from "./weaponsStore";
import { API_BASE_URL } from "../config/api";

export interface WeaponCatalogItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  image_url: string;
  tool_type: ToolType;
  tool_target: ToolTarget;
  impact: number;
  health: number;
  max_health: number;
  degrade_per_use: number;
  price: number;
  rarity: string;
}

interface ShopState {
  catalog: WeaponCatalogItem[];
  loading: boolean;
  error: string | null;
  buying: string | null;
  selectedCategory: string;

  // Actions
  fetchCatalog: () => Promise<void>;
  buyWeapon: (
    userId: string,
    catalogId: string
  ) => Promise<{ success: boolean; error?: string }>;
  setSelectedCategory: (category: string) => void;
  clearError: () => void;
  getFilteredCatalog: () => WeaponCatalogItem[];
  getCategories: () => string[];
}

export const useShopStore = create<ShopState>((set, get) => ({
  catalog: [], // Start empty, fetch from backend
  loading: false,
  error: null,
  buying: null,
  selectedCategory: "all",

  fetchCatalog: async () => {
    set({ loading: true, error: null });

    try {
      console.log("Fetching weapon catalog from backend...");
      const response = await fetch(`${API_BASE_URL}/weapons/catalog`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const catalog = await response.json();
      console.log("Received catalog from backend:", catalog);
      set({ catalog, loading: false });
    } catch (err) {
      console.error("Failed to fetch catalog from backend:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch catalog";
      set({ error: errorMessage, loading: false });
    }
  },

  buyWeapon: async (userId: string, catalogId: string) => {
    set({ buying: catalogId, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/weapons/${userId}/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ catalog_id: catalogId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      set({ buying: null });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to purchase weapon";
      set({ error: errorMessage, buying: null });
      return { success: false, error: errorMessage };
    }
  },

  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category });
  },

  clearError: () => {
    set({ error: null });
  },

  getFilteredCatalog: () => {
    const { catalog, selectedCategory } = get();
    return selectedCategory === "all"
      ? catalog
      : catalog.filter(
          (item) => item.tool_type.toLowerCase() === selectedCategory
        );
  },

  getCategories: () => {
    const { catalog } = get();
    const categories = Array.from(
      new Set(catalog.map((item) => item.tool_type.toLowerCase()))
    );
    return ["all", ...categories];
  },
}));
