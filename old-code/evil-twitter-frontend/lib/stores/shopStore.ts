import { create } from "zustand";
import { API_BASE_URL } from "../services/api";

export type ToolType = "Weapon" | "Support";
export type ToolTarget = "Tweet" | "User";

export interface CatalogItem {
  catalog_id: string;
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
  price: number;
}

interface ShopState {
  catalog: CatalogItem[];
  loading: boolean;
  error: string | null;
  buying: string | null;
  selectedCategory: string;

  // Actions
  fetchCatalog: () => Promise<void>;
  buyItem: (
    userId: string,
    catalogId: string
  ) => Promise<{ success: boolean; error?: string }>;
  setSelectedCategory: (category: string) => void;
  clearError: () => void;
  getFilteredCatalog: () => CatalogItem[];
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
      const response = await fetch(`${API_BASE_URL}/shop/catalog`);

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

  buyItem: async (userId: string, catalogId: string) => {
    set({ buying: catalogId, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/shop/${userId}/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ catalog_id: catalogId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to purchase item");
      }

      set({ buying: null });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to purchase item";
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
      : catalog.filter((item) => {
          const toolType =
            item.item?.item_type_metadata?.data?.tool_type?.toLowerCase();
          return toolType === selectedCategory;
        });
  },

  getCategories: () => {
    const { catalog } = get();
    const categories = Array.from(
      new Set(
        catalog
          .map((item) =>
            item.item?.item_type_metadata?.data?.tool_type?.toLowerCase()
          )
          .filter((cat): cat is string => cat !== undefined)
      )
    );
    return ["all", ...categories];
  },
}));
