import { create } from "zustand";
import { supabase } from "../supabase";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";

export type User = SupabaseUser;

export type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
};

export type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateUser: (data: any) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ isLoading: true });
    try {
      // Get initial session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth initialization error:", error);
        set({ error: error.message, isLoading: false, initialized: true });
        return;
      }

      if (session) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
          initialized: true,
        });
      } else {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          initialized: true,
        });
      }

      // Set up auth state listener
      supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth state changed:", event, session);
        if (session) {
          set({
            user: session.user,
            session,
            isAuthenticated: true,
          });
        } else {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
        }
      });
    } catch (error: any) {
      console.error("Auth initialization failed:", error);
      set({ error: error.message, isLoading: false, initialized: true });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  setSession: (session: Session | null) => {
    set({ session, user: session?.user || null, isAuthenticated: !!session });
  },

  login: async (email: string, password: string) => {
    console.log("Auth store: Attempting login...");
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Auth store: Login error:", error);
        throw error;
      }

      console.log("Auth store: Login successful", data);
      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      console.error("Auth store: Login failed:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName,
            username:
              fullName?.toLowerCase().replace(/\s+/g, "_") ||
              email.split("@")[0],
          },
        },
      });

      if (error) throw error;

      set({ isLoading: false });
      return { success: true };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      set({ isLoading: false });
      return { success: true };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  updateUser: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser(data);
      if (error) throw error;

      set({ isLoading: false });
      return { success: true };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  refreshSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
