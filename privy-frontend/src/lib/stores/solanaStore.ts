import { create } from "zustand";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../solana/connection";
import {
  getUserVaultTokenAccountPda,
  getUserAccountPda,
} from "../solana/pda";
import { PROGRAM_ID } from "../solana/program";

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

export const useSolanaStore = create<
  SolanaStoreState & SolanaStoreActions
>((set, get) => ({
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

    set({ loadingVaultBalance: true, error: null });

    try {
      const connection = getConnection();
      const [vaultTokenAccountPda] = getUserVaultTokenAccountPda(
        PROGRAM_ID,
        userWallet,
        tokenMint
      );

      const accountInfo = await connection.getAccountInfo(vaultTokenAccountPda);
      
      if (accountInfo && accountInfo.data.length >= 72) {
        // Token account amount is at offset 64 (8 bytes, little-endian)
        const amountBytes = accountInfo.data.slice(64, 72);
        // Convert Uint8Array to number (little-endian)
        let balance = 0;
        for (let i = 0; i < 8; i++) {
          balance += accountInfo.data[64 + i] * Math.pow(256, i);
        }
        
        set((state) => ({
          vaultBalances: {
            ...state.vaultBalances,
            [mintKey]: balance,
          },
          loadingVaultBalance: false,
        }));
      } else {
        // Account doesn't exist, balance is 0
        set((state) => ({
          vaultBalances: {
            ...state.vaultBalances,
            [mintKey]: 0,
          },
          loadingVaultBalance: false,
        }));
      }
    } catch (error) {
      // Account not found is expected if user hasn't created on-chain account yet
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Account not found") ||
        errorMessage.includes("AccountNotFound")
      ) {
        // This is expected - user hasn't created account yet or vault doesn't exist
        set((state) => ({
          vaultBalances: {
            ...state.vaultBalances,
            [mintKey]: null,
          },
          loadingVaultBalance: false,
        }));
      } else {
        console.error("Failed to fetch vault balance:", error);
        set({
          error: errorMessage,
          loadingVaultBalance: false,
        });
      }
    }
  },

  fetchOnchainAccountStatus: async (userWallet: PublicKey) => {
    set({ loadingOnchainAccount: true, error: null });

    try {
      const connection = getConnection();
      const [userAccountPda] = getUserAccountPda(PROGRAM_ID, userWallet);

      const accountInfo = await connection.getAccountInfo(userAccountPda);
      
      set({
        hasOnchainAccount: accountInfo !== null,
        loadingOnchainAccount: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch account status";
      
      // Account not found means user hasn't created account yet (expected)
      if (
        errorMessage.includes("Account not found") ||
        errorMessage.includes("AccountNotFound")
      ) {
        set({
          hasOnchainAccount: false,
          loadingOnchainAccount: false,
        });
      } else {
        console.error("Failed to fetch on-chain account status:", error);
        set({
          error: errorMessage,
          loadingOnchainAccount: false,
        });
      }
    }
  },

  updateVaultBalanceAfterTransaction: async (
    userWallet: PublicKey,
    tokenMint: PublicKey
  ) => {
    // Wait a bit for chain confirmation before fetching
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Clear cached balance for this mint to force refresh
    const mintKey = tokenMint.toBase58();
    set((state) => {
      const newBalances = { ...state.vaultBalances };
      delete newBalances[mintKey];
      return { vaultBalances: newBalances };
    });

    // Fetch fresh balance
    await get().fetchVaultBalance(userWallet, tokenMint);
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
}));

