import { useEffect } from "react";
import { supabase } from "../supabase/supabase";
import { useAuthStore } from "../stores/authStore";

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    signUp,
    logout,
    resetPassword,
    updateUser,
    refreshSession,
  } = useAuthStore();

  useEffect(() => {
    // Check for existing session on mount
    refreshSession();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN") {
        await refreshSession();
      } else if (event === "SIGNED_OUT") {
        await logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    signUp,
    logout,
    resetPassword,
    updateUser,
    updatePassword,
  };
};
