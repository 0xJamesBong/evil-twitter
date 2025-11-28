import { create } from "zustand";
import { ME_QUERY, MeQueryResult } from "../graphql/users/queries";
import {
  ONBOARD_USER_MUTATION,
  OnboardUserResult,
} from "../graphql/users/mutations";
import { graphqlRequest } from "../graphql/client";

type BackendUser = MeQueryResult["me"];

type BackendUserState = {
  user: BackendUser;
  isLoading: boolean;
  error: string | null;
  sessionAuthorityPda: string | null;
  sessionExpiresAt: number | null;
  sessionActive: boolean;
};

type BackendUserActions = {
  // Actions that handle GraphQL calls
  onboardUser: (
    identityToken: string,
    handle: string,
    displayName: string
  ) => Promise<void>;
  fetchMe: (identityToken: string) => Promise<void>;
  refreshMe: (identityToken: string) => Promise<void>;
  clear: () => void;
  // Session management
  setSession: (sessionAuthorityPda: string, expiresAt: number) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
};

export const useBackendUserStore = create<
  BackendUserState & BackendUserActions
>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  sessionAuthorityPda: null,
  sessionExpiresAt: null,
  sessionActive: false,
  onboardUser: async (
    identityToken: string,
    handle: string,
    displayName: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      console.log(
        "Onboarding user with handle:",
        handle,
        "and displayName:",
        displayName
      );
      const data = await graphqlRequest<OnboardUserResult>(
        ONBOARD_USER_MUTATION,
        { input: { handle, displayName } },
        identityToken
      );
      // OnboardUser returns user, but we'll fetch full profile with fetchMe
      set({ isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to onboard user",
        isLoading: false,
      });
      throw e;
    }
  },
  fetchMe: async (identityToken: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log("fetchMe | identityToken", identityToken);
      const data = await graphqlRequest<MeQueryResult>(
        ME_QUERY,
        undefined,
        identityToken
      );
      console.log("fetchMe | data", data);
      set({ user: data.me, isLoading: false });
    } catch (e) {
      console.error("fetchMe | error", e);
      set({
        error: e instanceof Error ? e.message : "Failed to fetch user",
        isLoading: false,
      });
      throw e;
    }
  },
  refreshMe: async (identityToken: string) => {
    // Refresh without showing loading state (for polling)
    try {
      const data = await graphqlRequest<MeQueryResult>(
        ME_QUERY,
        undefined,
        identityToken
      );
      set({ user: data.me });
    } catch (e) {
      // Silently fail on refresh to avoid disrupting UX
      console.error("Failed to refresh user data:", e);
    }
  },
  clear: () => {
    set({ user: null, isLoading: false, error: null });
  },
  setSession: (sessionAuthorityPda: string, expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    set({
      sessionAuthorityPda,
      sessionExpiresAt: expiresAt,
      sessionActive: expiresAt > now,
    });
  },
  clearSession: () => {
    set({
      sessionAuthorityPda: null,
      sessionExpiresAt: null,
      sessionActive: false,
    });
  },
  isSessionValid: () => {
    const state = get();
    if (!state.sessionExpiresAt) return false;
    const now = Math.floor(Date.now() / 1000);
    const isValid = state.sessionExpiresAt > now;
    if (state.sessionActive !== isValid) {
      set({ sessionActive: isValid });
    }
    return isValid;
  },
}));
