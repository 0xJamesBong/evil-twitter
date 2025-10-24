import { create } from "zustand";
import { api } from "../services/api";
import { ToolType, ToolTarget } from "./weaponsStore";

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
  catalog: [],
  loading: false,
  error: null,
  buying: null,
  selectedCategory: "all",

  fetchCatalog: async () => {
    set({ loading: true, error: null });

    try {
      const catalog = await api.getWeaponCatalog();
      set({ catalog, loading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load catalog";
      set({ error: errorMessage, loading: false });
    }
  },

  buyWeapon: async (userId: string, catalogId: string) => {
    set({ buying: catalogId, error: null });

    try {
      await api.buyWeapon(userId, catalogId);
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
