import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

export type TokenType = "Dooler" | "Usdc" | "Sol" | "Bling";

export interface PriceRatio {
  tokenUnits: number;
  usdcUnits: number;
}

export interface PriceEntry {
  ratio: PriceRatio;
  spread: number;
}

export interface Prices {
  dooler: PriceEntry;
  usdc: PriceEntry;
  bling: PriceEntry;
  sol: PriceEntry;
}

export interface ExchangeRequest {
  fromToken: TokenType;
  toToken: TokenType;
  amount: number;
}

export interface ExchangeResponse {
  fromToken: TokenType;
  toToken: TokenType;
  inputAmount: number;
  outputAmount: number;
  rateUsed: number;
}

interface ExchangeState {
  prices: Prices | null;
  loading: boolean;
  error: string | null;
  fromToken: TokenType;
  toToken: TokenType;
  amount: string;
  calculatedOutput: number | null;
  rate: number | null;
}

interface ExchangeActions {
  fetchPrices: () => Promise<void>;
  setFromToken: (token: TokenType) => void;
  setToToken: (token: TokenType) => void;
  setAmount: (amount: string) => void;
  calculateExchange: () => Promise<void>;
  clearError: () => void;
}

type ExchangeStore = ExchangeState & ExchangeActions;

export const useExchangeStore = create<ExchangeStore>((set, get) => ({
  // State
  prices: null,
  loading: false,
  error: null,
  fromToken: "Usdc",
  toToken: "Dooler",
  amount: "",
  calculatedOutput: null,
  rate: null,

  // Actions
  fetchPrices: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/exchange/prices`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const prices = await response.json();
      set({ prices, loading: false });

      // Auto-calculate if amount is set
      const { amount } = get();
      if (amount && parseFloat(amount) > 0) {
        get().calculateExchange();
      }
    } catch (err) {
      console.error("Failed to fetch prices:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch prices";
      set({ error: errorMessage, loading: false });
    }
  },

  setFromToken: (token: TokenType) => {
    set({ fromToken: token });
    // Auto-calculate if amount is set
    const { amount } = get();
    if (amount && parseFloat(amount) > 0) {
      get().calculateExchange();
    }
  },

  setToToken: (token: TokenType) => {
    set({ toToken: token });
    // Auto-calculate if amount is set
    const { amount } = get();
    if (amount && parseFloat(amount) > 0) {
      get().calculateExchange();
    }
  },

  setAmount: (amount: string) => {
    set({ amount });
    // Validate and calculate
    const numAmount = parseFloat(amount);
    if (amount === "" || isNaN(numAmount) || numAmount <= 0) {
      set({ calculatedOutput: null, rate: null });
      return;
    }

    // Auto-calculate when amount changes
    get().calculateExchange();
  },

  calculateExchange: async () => {
    const { fromToken, toToken, amount } = get();
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      set({ calculatedOutput: null, rate: null });
      return;
    }

    if (fromToken === toToken) {
      set({ calculatedOutput: numAmount, rate: 1.0 });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch(`${API_BASE_URL}/exchange`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromToken,
          toToken,
          amount: numAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: ExchangeResponse = await response.json();
      set({
        calculatedOutput: data.outputAmount,
        rate: data.rateUsed,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to calculate exchange:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to calculate exchange";
      set({ error: errorMessage, loading: false, calculatedOutput: null });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
