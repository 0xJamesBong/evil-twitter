import { create } from "zustand";
import { PublicKey } from "@solana/web3.js";

type SolanaStoreState = {
  // Data
  vaultBalances: Record<string, number | null>; // Keyed by token mint address (base58)
  hasOnchainAccount: boolean | null;

  // Loading states
  loadingVaultBalance: boolean;
  loadingOnchainAccount: boolean;

  // Error state
  error: string | null;
};

type SolanaStoreActions = {
  // Fetch operations
  fetchVaultBalance: (
    userWallet: PublicKey,
    tokenMint: PublicKey
  ) => Promise<void>;
  fetchOnchainAccountStatus: (userWallet: PublicKey) => Promise<void>;
  updateVaultBalanceAfterTransaction: (
    userWallet: PublicKey,
    tokenMint: PublicKey
  ) => Promise<void>;

  // Utility operations
  clearVaultBalances: () => void;
  clearError: () => void;
};

export const useSolanaStore = create<SolanaStoreState & SolanaStoreActions>(
  (set, get) => ({
    // Initial state
    vaultBalances: {},
    hasOnchainAccount: null,
    loadingVaultBalance: false,
    loadingOnchainAccount: false,
    error: null,

    // ========================================================================
    // Fetch Operations
    // ========================================================================

    fetchVaultBalance: async (userWallet: PublicKey, tokenMint: PublicKey) => {
      const mintKey = tokenMint.toBase58();

      // Check if we already have this balance cached
      if (get().vaultBalances[mintKey] !== undefined) {
        return;
      }

      // This method is now a no-op - vault balance is fetched via GraphQL
      // and stored in backendUserStore. This maintains the interface for
      // existing code that calls this method.
      // The actual balance should be read from useBackendUserStore().user?.vaultBalance
      set({ loadingVaultBalance: false });
    },

    fetchOnchainAccountStatus: async (userWallet: PublicKey) => {
      // This method is now a no-op - on-chain account status is fetched via GraphQL
      // and stored in backendUserStore. This maintains the interface for
      // existing code that calls this method.
      // The actual status should be read from useBackendUserStore().user?.hasOnchainAccount
      set({ loadingOnchainAccount: false });
    },

    updateVaultBalanceAfterTransaction: async (
      userWallet: PublicKey,
      tokenMint: PublicKey
    ) => {
      // Wait a bit for chain confirmation before refreshing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Clear cached balance for this mint to force refresh
      const mintKey = tokenMint.toBase58();
      set((state) => {
        const newBalances = { ...state.vaultBalances };
        delete newBalances[mintKey];
        return { vaultBalances: newBalances };
      });

      // Note: The actual balance refresh should be done via backendUserStore.refreshMe()
      // This method maintains the interface for existing code
    },

    // ========================================================================
    // Utility Operations
    // ========================================================================

    clearVaultBalances: () => {
      set({ vaultBalances: {} });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);
