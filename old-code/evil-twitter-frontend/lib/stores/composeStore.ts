import { create } from "zustand";
import { useTweetsStore } from "./tweetsStore";

export interface ComposeState {
  content: string;
  isSubmitting: boolean;
  error: string | null;
  remainingChars: number;
  isOverLimit: boolean;
}

export interface ComposeActions {
  setContent: (content: string) => void;
  clearContent: () => void;
  submitTweet: () => Promise<void>;
  setError: (error: string | null) => void;
  setSubmitting: (submitting: boolean) => void;
}

const MAX_CHARS = 280;

export const useComposeStore = create<ComposeState & ComposeActions>(
  (set, get) => ({
    content: "",
    isSubmitting: false,
    error: null,
    remainingChars: MAX_CHARS,
    isOverLimit: false,

    setContent: (content: string) => {
      const remainingChars = MAX_CHARS - content.length;
      const isOverLimit = remainingChars < 0;

      set({
        content,
        remainingChars,
        isOverLimit,
        error: null, // Clear error when user types
      });
    },

    clearContent: () => {
      set({
        content: "",
        remainingChars: MAX_CHARS,
        isOverLimit: false,
        error: null,
      });
    },

    submitTweet: async () => {
      const { content, isSubmitting, isOverLimit } = get();

      if (!content.trim() || isOverLimit || isSubmitting) {
        return;
      }

      set({ isSubmitting: true, error: null });

      try {
        const { createTweet } = useTweetsStore.getState();
        const result = await createTweet(content);
        console.log("createTweet result:", result);
        if (result.success) {
          get().clearContent();
        } else {
          set({ error: result.error || "Failed to create tweet" });
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        set({ isSubmitting: false });
      }
    },

    setError: (error: string | null) => {
      set({ error });
    },

    setSubmitting: (submitting: boolean) => {
      set({ isSubmitting: submitting });
    },
  })
);
