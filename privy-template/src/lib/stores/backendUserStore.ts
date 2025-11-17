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
};

type BackendUserActions = {
  // Actions that handle GraphQL calls
  onboardUser: (
    accessToken: string,
    handle: string,
    displayName: string
  ) => Promise<void>;
  fetchMe: (accessToken: string) => Promise<void>;
  clear: () => void;
};

export const useBackendUserStore = create<
  BackendUserState & BackendUserActions
>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  onboardUser: async (
    accessToken: string,
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
        accessToken
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
  fetchMe: async (accessToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await graphqlRequest<MeQueryResult>(
        ME_QUERY,
        undefined,
        accessToken
      );
      set({ user: data.me, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to fetch user",
        isLoading: false,
      });
      throw e;
    }
  },
  clear: () => {
    set({ user: null, isLoading: false, error: null });
  },
}));
