import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { create } from "zustand";
import { API_BASE_URL } from "../config/api";
import { supabase } from "../supabase";
import { useBackendUserStore } from "./backendUserStore";

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
      console.log("session.user", session?.user);
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

      // create the user in the backend
      if (session?.user) {
        useBackendUserStore.getState().syncWithSupabase(session.user);
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
          // Sync with backend when auth state changes
          useBackendUserStore.getState().syncWithSupabase(session.user);
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

      // Sync with backend user data
      if (data.user) {
        useBackendUserStore.getState().syncWithSupabase(data.user);
      }
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

      // If user was created successfully, create user in backend database
      if (data.user) {
        try {
          const username =
            fullName?.toLowerCase().replace(/\s+/g, "_") || email.split("@")[0];
          const displayName = fullName || email.split("@")[0];

          const response = await fetch(`${API_BASE_URL}/users`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              supabase_id: data.user.id,
              username,
              display_name: displayName,
              email,
              password: "", // We don't store password in backend since Supabase handles auth
              avatar_url: null,
              bio: null,
            }),
          });

          if (!response.ok) {
            console.warn(
              "Failed to create user in backend database:",
              await response.text()
            );
            // Don't throw error here - Supabase user was created successfully
          } else {
            // Sync with backend user data after successful creation
            useBackendUserStore.getState().syncWithSupabase(data.user);
          }
        } catch (backendError) {
          console.warn("Error creating user in backend:", backendError);
          // Don't throw error here - Supabase user was created successfully
        }
      }

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

      // Clear backend user data
      useBackendUserStore.getState().clearUser();
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
