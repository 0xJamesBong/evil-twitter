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

// Mock catalog data for development/fallback
const MOCK_CATALOG: WeaponCatalogItem[] = [
  {
    id: "sword_of_truth",
    name: "Sword of Truth",
    emoji: "⚔️",
    description:
      "A legendary blade that cuts through lies and misinformation. Deals devastating damage to false narratives.",
    image_url: "https://example.com/sword.png",
    tool_type: "Weapon" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 30,
    health: 100,
    max_health: 100,
    degrade_per_use: 1,
    price: 1500,
    rarity: "legendary",
  },
  {
    id: "ban_hammer",
    name: "Ban Hammer",
    emoji: "🔨",
    description:
      "The ultimate moderation tool. One swing can silence the loudest trolls.",
    image_url: "https://example.com/hammer.png",
    tool_type: "Weapon" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 40,
    health: 80,
    max_health: 80,
    degrade_per_use: 1,
    price: 2000,
    rarity: "legendary",
  },
  {
    id: "ratio_rifle",
    name: "Ratio Rifle",
    emoji: "🔫",
    description:
      "Precision weapon that exposes bad takes with surgical accuracy.",
    image_url: "https://example.com/rifle.png",
    tool_type: "Weapon" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 25,
    health: 60,
    max_health: 60,
    degrade_per_use: 1,
    price: 1200,
    rarity: "rare",
  },
  {
    id: "sarcasm_saber",
    name: "Sarcasm Saber",
    emoji: "🗡️",
    description:
      "Cuts deep with witty remarks. Effective against serious takes.",
    image_url: "https://example.com/saber.png",
    tool_type: "Weapon" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 20,
    health: 70,
    max_health: 70,
    degrade_per_use: 1,
    price: 800,
    rarity: "uncommon",
  },
  {
    id: "wholesome_wand",
    name: "Wholesome Wand",
    emoji: "✨",
    description:
      "Spreads positivity and heals damaged tweets. Restores faith in humanity.",
    image_url: "https://example.com/wand.png",
    tool_type: "Support" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 40,
    health: 80,
    max_health: 80,
    degrade_per_use: 1,
    price: 1100,
    rarity: "rare",
  },
  {
    id: "copium_canister",
    name: "Copium Canister",
    emoji: "💊",
    description:
      "Emergency healing item. Helps you cope with bad engagement metrics.",
    image_url: "https://example.com/copium.png",
    tool_type: "Support" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 30,
    health: 50,
    max_health: 50,
    degrade_per_use: 1,
    price: 500,
    rarity: "common",
  },
  {
    id: "viral_virus",
    name: "Viral Virus",
    emoji: "🦠",
    description:
      "Infects tweets with contagious content. Spreads like wildfire.",
    image_url: "https://example.com/virus.png",
    tool_type: "Weapon" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 35,
    health: 50,
    max_health: 50,
    degrade_per_use: 1,
    price: 1800,
    rarity: "rare",
  },
  {
    id: "troll_shield",
    name: "Troll Shield",
    emoji: "🛡️",
    description: "Protects your tweets from negative energy and bad vibes.",
    image_url: "https://example.com/shield.png",
    tool_type: "Support" as ToolType,
    tool_target: "Tweet" as ToolTarget,
    impact: 25,
    health: 60,
    max_health: 60,
    degrade_per_use: 1,
    price: 600,
    rarity: "common",
  },
];

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
      console.warn("Falling back to mock data");
      // Keep mock data on error instead of showing error
      set({ catalog: MOCK_CATALOG, loading: false, error: null });
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
