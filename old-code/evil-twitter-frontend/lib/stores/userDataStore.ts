import { create } from "zustand";
import { apiService } from "../services/api";

interface UserData {
  dollar_conversion_rate: number;
}

interface UserDataState {
  // Cache of user data by user ID
  userDataCache: Map<string, UserData>;
  // Loading states by user ID
  loadingStates: Map<string, boolean>;
  // Error states by user ID
  errorStates: Map<string, string | null>;

  // Actions
  fetchUserData: (userId: string) => Promise<void>;
  getUserData: (userId: string) => UserData | null;
  isLoading: (userId: string) => boolean;
  getError: (userId: string) => string | null;
  clearCache: () => void;
}

export const useUserDataStore = create<UserDataState>((set, get) => ({
  userDataCache: new Map(),
  loadingStates: new Map(),
  errorStates: new Map(),

  fetchUserData: async (userId: string) => {
    const state = get();

    // If already loading or cached, don't fetch again
    if (state.loadingStates.get(userId) || state.userDataCache.has(userId)) {
      return;
    }

    // Set loading state
    set((state) => {
      const newLoadingStates = new Map(state.loadingStates);
      newLoadingStates.set(userId, true);
      return { loadingStates: newLoadingStates };
    });

    // Clear any previous error
    set((state) => {
      const newErrorStates = new Map(state.errorStates);
      newErrorStates.set(userId, null);
      return { errorStates: newErrorStates };
    });

    try {
      const userData = await apiService.getUserById(userId);

      // Update cache and clear loading state
      set((state) => {
        const newUserDataCache = new Map(state.userDataCache);
        const newLoadingStates = new Map(state.loadingStates);
        const newErrorStates = new Map(state.errorStates);

        newUserDataCache.set(userId, userData);
        newLoadingStates.set(userId, false);
        newErrorStates.set(userId, null);

        return {
          userDataCache: newUserDataCache,
          loadingStates: newLoadingStates,
          errorStates: newErrorStates,
        };
      });
    } catch (error) {
      console.error("Failed to fetch user data:", error);

      // Set error state and clear loading
      set((state) => {
        const newLoadingStates = new Map(state.loadingStates);
        const newErrorStates = new Map(state.errorStates);

        newLoadingStates.set(userId, false);
        newErrorStates.set(
          userId,
          error instanceof Error ? error.message : "Unknown error"
        );

        return {
          loadingStates: newLoadingStates,
          errorStates: newErrorStates,
        };
      });
    }
  },

  getUserData: (userId: string) => {
    return get().userDataCache.get(userId) || null;
  },

  isLoading: (userId: string) => {
    return get().loadingStates.get(userId) || false;
  },

  getError: (userId: string) => {
    return get().errorStates.get(userId) || null;
  },

  clearCache: () => {
    set({
      userDataCache: new Map(),
      loadingStates: new Map(),
      errorStates: new Map(),
    });
  },
}));
