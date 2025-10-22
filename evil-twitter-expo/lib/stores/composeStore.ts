import { create } from "zustand";
import { TweetVisibility } from "./tweetsStore";

interface ComposeState {
  content: string;
  isSubmitting: boolean;
  error: string | null;
  visibility: TweetVisibility;

  // Actions
  setContent: (content: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  setVisibility: (visibility: TweetVisibility) => void;
  clearCompose: () => void;
}

export const useComposeStore = create<ComposeState>((set) => ({
  content: "",
  isSubmitting: false,
  error: null,
  visibility: "public",

  setContent: (content: string) => {
    set({ content });
  },

  setIsSubmitting: (isSubmitting: boolean) => {
    set({ isSubmitting });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setVisibility: (visibility: TweetVisibility) => {
    set({ visibility });
  },

  clearCompose: () => {
    set({ content: "", isSubmitting: false, error: null, visibility: "public" });
  },
}));
