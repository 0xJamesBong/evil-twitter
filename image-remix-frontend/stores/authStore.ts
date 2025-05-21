import { createStore } from "zustand/vanilla";
import { supabase } from "../supabase/supabase";

export type AuthStates = {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  loginError: string | null;
};

export type AuthLoadingStates = {
  isLoginLoading: boolean;
  isLogoutLoading: boolean;
  isRefreshLoading: boolean;
};

const defaultAuthStates: AuthStates = {
  user: null,
  token: null,
  isAuthenticated: false,
  loginError: null,
};

const defaultAuthLoadingStates: AuthLoadingStates = {
  isLoginLoading: false,
  isLogoutLoading: false,
  isRefreshLoading: false,
};

export type AuthStoreStates = AuthStates & AuthLoadingStates;

export type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export type AuthStore = AuthStoreStates & AuthActions;

export const createAuthStore = () => {
  return createStore<AuthStore>((set, get) => ({
    ...defaultAuthStates,
    ...defaultAuthLoadingStates,

    login: async (email, password) => {
      set({ isLoginLoading: true, loginError: null });
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data } = await supabase.auth.getSession();
        set({
          user: data.session?.user,
          token: data.session?.access_token,
          isAuthenticated: true,
          isLoginLoading: false,
        });
      } catch (error: any) {
        set({ loginError: error.message || "Login failed", isLoginLoading: false });
      }
    },

    logout: async () => {
      set({ isLogoutLoading: true });
      try {
        await supabase.auth.signOut();
        set({
          ...defaultAuthStates,
          isLogoutLoading: false,
        });
      } catch (error) {
        console.error("Logout failed:", error);
        set({ isLogoutLoading: false });
      }
    },

    refresh: async () => {
      set({ isRefreshLoading: true });
      try {
        const { data } = await supabase.auth.getSession();
        set({
          user: data.session?.user,
          token: data.session?.access_token,
          isAuthenticated: !!data.session?.user,
          isRefreshLoading: false,
        });
      } catch (error) {
        console.error("Refresh session failed:", error);
        set({ isRefreshLoading: false });
      }
    },
  }));
};
