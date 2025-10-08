import { create } from "zustand";

interface ComposeState {
  content: string;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setContent: (content: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  clearCompose: () => void;
}

export const useComposeStore = create<ComposeState>((set) => ({
  content: "",
  isSubmitting: false,
  error: null,

  setContent: (content: string) => {
    set({ content });
  },

  setIsSubmitting: (isSubmitting: boolean) => {
    set({ isSubmitting });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearCompose: () => {
    set({ content: "", isSubmitting: false, error: null });
  },
}));
