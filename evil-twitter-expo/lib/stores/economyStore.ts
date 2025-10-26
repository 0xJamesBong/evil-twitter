import { create } from "zustand";
import { API_BASE_URL } from "../config/api";
import { getAuthHeaders, parseMongoId } from "../utils/authHeaders";

export interface TokenBalance {
  id: string;
  tokenSymbol: string;
  available: number;
  locked: number;
  updatedAt?: string | null;
}

export interface ShopItem {
  id: string;
  name: string;
  description?: string | null;
  mediaUrl?: string | null;
  assetBlueprint: string;
  assetAttributes?: Record<string, unknown> | null;
  priceToken: string;
  priceAmount: number;
  totalSupply?: number | null;
  remainingSupply?: number | null;
  isActive: boolean;
}

export interface UserAsset {
  id: string;
  ownerId: string;
  assetType: string;
  name: string;
  description?: string | null;
  mediaUrl?: string | null;
  attributes?: Record<string, unknown> | null;
  tradeable: boolean;
  isLocked: boolean;
  status: string;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface MarketplaceListing {
  id: string;
  assetId: string;
  sellerId: string;
  priceToken: string;
  priceAmount: number;
  feeBps: number;
  status: string;
  buyerId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  filledAt?: string | null;
}

interface LoadingState {
  balances: boolean;
  assets: boolean;
  shop: boolean;
  listings: boolean;
}

interface ActionState {
  purchasingItem?: string | null;
  listingAsset?: boolean;
  purchasingListing?: string | null;
  cancellingListing?: string | null;
}

interface EconomyState {
  balances: TokenBalance[];
  assets: UserAsset[];
  shopItems: ShopItem[];
  listings: MarketplaceListing[];
  loading: LoadingState;
  actionState: ActionState;
  error: string | null;
  marketplaceError: string | null;
  selectedToken: string;
}

interface EconomyActions {
  fetchBalances: (userId: string) => Promise<void>;
  fetchAssets: (userId: string) => Promise<void>;
  fetchShopItems: () => Promise<void>;
  fetchListings: () => Promise<void>;
  refreshAll: (userId: string) => Promise<void>;
  buyShopItem: (userId: string, itemId: string) => Promise<boolean>;
  listAsset: (params: {
    assetId: string;
    priceToken: string;
    priceAmount: number;
    feeBps?: number;
    userId: string;
  }) => Promise<{ success: boolean; error?: string }>;
  purchaseListing: (
    listingId: string,
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  cancelListing: (
    listingId: string,
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  setSelectedToken: (token: string) => void;
  clearErrors: () => void;
}

type EconomyStore = EconomyState & EconomyActions;

const normalizeShopItem = (raw: any): ShopItem => {
  const id = parseMongoId(raw?._id) ?? String(raw?.id ?? "");
  return {
    id,
    name: raw?.name ?? "Mystery Pack",
    description: raw?.description ?? null,
    mediaUrl: raw?.media_url ?? null,
    assetBlueprint: raw?.asset_blueprint ?? "collectible",
    assetAttributes: raw?.asset_attributes ?? null,
    priceToken: raw?.price_token ?? "EVL",
    priceAmount: Number(raw?.price_amount ?? 0),
    totalSupply: raw?.total_supply ?? null,
    remainingSupply: raw?.remaining_supply ?? null,
    isActive: Boolean(raw?.is_active ?? false),
  };
};

const normalizeAsset = (raw: any): UserAsset => {
  const id = parseMongoId(raw?._id) ?? String(raw?.id ?? "");
  return {
    id,
    ownerId: raw?.owner_id ?? "",
    assetType: raw?.asset_type ?? "collectible",
    name: raw?.name ?? "Unknown Asset",
    description: raw?.description ?? null,
    mediaUrl: raw?.media_url ?? null,
    attributes: raw?.attributes ?? null,
    tradeable: Boolean(raw?.tradeable ?? false),
    isLocked: Boolean(raw?.is_locked ?? false),
    status: raw?.status ?? "active",
    updatedAt: raw?.updated_at ?? null,
    createdAt: raw?.created_at ?? null,
  };
};

const normalizeListing = (raw: any): MarketplaceListing => {
  const id = parseMongoId(raw?._id) ?? String(raw?.id ?? "");
  return {
    id,
    assetId: parseMongoId(raw?.asset_id) ?? raw?.asset_id ?? "",
    sellerId: raw?.seller_id ?? "",
    priceToken: raw?.price_token ?? "EVL",
    priceAmount: Number(raw?.price_amount ?? 0),
    feeBps: Number(raw?.fee_bps ?? 250),
    status: raw?.status ?? "active",
    buyerId: raw?.buyer_id ?? null,
    createdAt: raw?.created_at ?? null,
    updatedAt: raw?.updated_at ?? null,
    filledAt: raw?.filled_at ?? null,
  };
};

const normalizeBalance = (raw: any): TokenBalance => {
  const id = parseMongoId(raw?._id) ?? String(raw?.id ?? "");
  return {
    id,
    tokenSymbol: raw?.token_symbol ?? "EVL",
    available: Number(raw?.available ?? 0),
    locked: Number(raw?.locked ?? 0),
    updatedAt: raw?.updated_at ?? null,
  };
};

export const useEconomyStore = create<EconomyStore>((set, get) => ({
  balances: [],
  assets: [],
  shopItems: [],
  listings: [],
  loading: {
    balances: false,
    assets: false,
    shop: false,
    listings: false,
  },
  actionState: {},
  error: null,
  marketplaceError: null,
  selectedToken: "EVL",

  setSelectedToken: (token: string) => {
    set({ selectedToken: token });
  },

  clearErrors: () => {
    set({ error: null, marketplaceError: null });
  },

  fetchBalances: async (userId: string) => {
    if (!userId) {
      return;
    }
    set((state) => ({
      loading: { ...state.loading, balances: true },
      error: null,
    }));
    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(
        `${API_BASE_URL}/economy/users/${userId}/balances`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Balance request failed (${response.status})`);
      }

      const data = await response.json();
      const balances: TokenBalance[] = Array.isArray(data)
        ? data.map(normalizeBalance)
        : [];
      set((state) => ({
        balances,
        loading: { ...state.loading, balances: false },
      }));
    } catch (error) {
      console.error("fetchBalances failed", error);
      set((state) => ({
        loading: { ...state.loading, balances: false },
        error:
          error instanceof Error ? error.message : "Failed to load balances",
      }));
    }
  },

  fetchAssets: async (userId: string) => {
    if (!userId) {
      return;
    }
    set((state) => ({
      loading: { ...state.loading, assets: true },
      error: null,
    }));
    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(
        `${API_BASE_URL}/economy/users/${userId}/assets`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Asset request failed (${response.status})`);
      }

      const data = await response.json();
      const assets: UserAsset[] = Array.isArray(data)
        ? data.map(normalizeAsset)
        : [];
      set((state) => ({
        assets,
        loading: { ...state.loading, assets: false },
      }));
    } catch (error) {
      console.error("fetchAssets failed", error);
      set((state) => ({
        loading: { ...state.loading, assets: false },
        error:
          error instanceof Error ? error.message : "Failed to load assets",
      }));
    }
  },

  fetchShopItems: async () => {
    set((state) => ({
      loading: { ...state.loading, shop: true },
      error: null,
    }));
    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(`${API_BASE_URL}/economy/shop/items`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Shop request failed (${response.status})`);
      }

      const data = await response.json();
      const shopItems: ShopItem[] = Array.isArray(data)
        ? data.map(normalizeShopItem).filter((item) => item.isActive)
        : [];
      set((state) => ({
        shopItems,
        loading: { ...state.loading, shop: false },
      }));
    } catch (error) {
      console.error("fetchShopItems failed", error);
      set((state) => ({
        loading: { ...state.loading, shop: false },
        error:
          error instanceof Error ? error.message : "Failed to load shop items",
      }));
    }
  },

  fetchListings: async () => {
    set((state) => ({
      loading: { ...state.loading, listings: true },
      marketplaceError: null,
    }));
    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(
        `${API_BASE_URL}/economy/marketplace/listings`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Listings request failed (${response.status})`);
      }

      const data = await response.json();
      const listings: MarketplaceListing[] = Array.isArray(data)
        ? data.map(normalizeListing)
        : [];
      set((state) => ({
        listings,
        loading: { ...state.loading, listings: false },
      }));
    } catch (error) {
      console.error("fetchListings failed", error);
      set((state) => ({
        loading: { ...state.loading, listings: false },
        marketplaceError:
          error instanceof Error
            ? error.message
            : "Failed to load marketplace listings",
      }));
    }
  },

  refreshAll: async (userId: string) => {
    await Promise.all([
      get().fetchBalances(userId),
      get().fetchAssets(userId),
      get().fetchShopItems(),
      get().fetchListings(),
    ]);
  },

  buyShopItem: async (userId: string, itemId: string) => {
    if (!userId) {
      set({ error: "You must be logged in to purchase items." });
      return false;
    }
    set((state) => ({
      actionState: { ...state.actionState, purchasingItem: itemId },
      error: null,
    }));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/economy/shop/items/${itemId}/purchase`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && payload.error) ||
          `Purchase failed (${response.status})`;
        throw new Error(message);
      }

      await Promise.all([
        get().fetchBalances(userId),
        get().fetchAssets(userId),
        get().fetchShopItems(),
      ]);

      set((state) => ({
        actionState: { ...state.actionState, purchasingItem: null },
      }));
      return true;
    } catch (error) {
      console.error("buyShopItem failed", error);
      set((state) => ({
        actionState: { ...state.actionState, purchasingItem: null },
        error:
          error instanceof Error ? error.message : "Unable to purchase item",
      }));
      return false;
    }
  },

  listAsset: async ({
    assetId,
    priceToken,
    priceAmount,
    feeBps = 250,
    userId,
  }) => {
    if (!userId) {
      return {
        success: false,
        error: "You must be logged in to list assets.",
      };
    }
    set((state) => ({
      actionState: { ...state.actionState, listingAsset: true },
      marketplaceError: null,
    }));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/economy/marketplace/listings`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            asset_id: assetId,
            price_token: priceToken,
            price_amount: priceAmount,
            fee_bps: feeBps,
          }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && payload.error) ||
          `Unable to create listing (${response.status})`;
        throw new Error(message);
      }

      await Promise.all([
        get().fetchAssets(userId),
        get().fetchListings(),
      ]);

      set((state) => ({
        actionState: { ...state.actionState, listingAsset: false },
      }));
      return { success: true };
    } catch (error) {
      console.error("listAsset failed", error);
      set((state) => ({
        actionState: { ...state.actionState, listingAsset: false },
        marketplaceError:
          error instanceof Error ? error.message : "Unable to create listing",
      }));
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to create listing",
      };
    }
  },

  purchaseListing: async (listingId: string, userId: string) => {
    if (!userId) {
      return {
        success: false,
        error: "You must be logged in to purchase listings.",
      };
    }
    set((state) => ({
      actionState: { ...state.actionState, purchasingListing: listingId },
      marketplaceError: null,
    }));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/economy/marketplace/listings/${listingId}/buy`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && payload.error) ||
          `Unable to purchase listing (${response.status})`;
        throw new Error(message);
      }

      await Promise.all([
        get().fetchAssets(userId),
        get().fetchBalances(userId),
        get().fetchListings(),
      ]);

      set((state) => ({
        actionState: { ...state.actionState, purchasingListing: null },
      }));
      return { success: true };
    } catch (error) {
      console.error("purchaseListing failed", error);
      set((state) => ({
        actionState: { ...state.actionState, purchasingListing: null },
        marketplaceError:
          error instanceof Error
            ? error.message
            : "Unable to purchase listing",
      }));
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to purchase listing",
      };
    }
  },

  cancelListing: async (listingId: string, userId: string) => {
    if (!userId) {
      return {
        success: false,
        error: "You must be logged in to cancel listings.",
      };
    }
    set((state) => ({
      actionState: { ...state.actionState, cancellingListing: listingId },
      marketplaceError: null,
    }));

    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(
        `${API_BASE_URL}/economy/marketplace/listings/${listingId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          (payload && payload.error) ||
          `Unable to cancel listing (${response.status})`;
        throw new Error(message);
      }

      await Promise.all([
        get().fetchAssets(userId),
        get().fetchListings(),
      ]);

      set((state) => ({
        actionState: { ...state.actionState, cancellingListing: null },
      }));
      return { success: true };
    } catch (error) {
      console.error("cancelListing failed", error);
      set((state) => ({
        actionState: { ...state.actionState, cancellingListing: null },
        marketplaceError:
          error instanceof Error ? error.message : "Unable to cancel listing",
      }));
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to cancel listing",
      };
    }
  },
}));
