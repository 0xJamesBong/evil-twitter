import { create } from "zustand";
import { API_BASE_URL } from "../services/api";

export interface WeaponCatalogItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  max_health: number;
  attack_power: number;
  heal_power: number;
  price: number;
  rarity: string;
}

interface ShopState {
  catalog: WeaponCatalogItem[];
  loading: boolean;
  error: string | null;
  creating: string | null;
  selectedCategory: string;

  // Actions
  fetchCatalog: () => Promise<void>;
  createWeapon: (
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
  creating: null,
  selectedCategory: "all",

  fetchCatalog: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/weapons/catalog`);

      if (!response.ok) {
        throw new Error("Failed to fetch catalog");
      }

      const data = await response.json();
      set({ catalog: data, loading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load catalog";
      set({ error: errorMessage, loading: false });
    }
  },

  createWeapon: async (userId: string, catalogId: string) => {
    set({ creating: catalogId, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/weapons/${userId}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ catalog_id: catalogId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create weapon");
      }

      set({ creating: null });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create weapon";
      set({ error: errorMessage, creating: null });
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
      : catalog.filter((item) => item.category === selectedCategory);
  },

  getCategories: () => {
    const { catalog } = get();
    const categories = Array.from(
      new Set(catalog.map((item) => item.category))
    );
    return ["all", ...categories];
  },
}));
