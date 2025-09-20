import { create } from "zustand";
import { supabase } from "../supabase";

export interface Tweet {
  id: string | { $oid: string };
  content: string;
  created_at: string | { $date: { $numberLong: string } };
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  is_liked: boolean;
  is_retweeted: boolean;
  media_urls?: string[];
  author_id: string | { $oid: string };
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  author_is_verified?: boolean;
}

export interface TweetsState {
  tweets: Tweet[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  lastFetchedAt: Date | null;
}

export interface TweetsActions {
  fetchTweets: () => Promise<void>;
  createTweet: (
    content: string
  ) => Promise<{ success: boolean; error?: string; tweet?: Tweet }>;
  generateFakeTweets: () => Promise<{ success: boolean; error?: string }>;
  likeTweet: (tweetId: string) => Promise<void>;
  unlikeTweet: (tweetId: string) => Promise<void>;
  addTweet: (tweet: Tweet) => void;
  updateTweet: (tweetId: string, updates: Partial<Tweet>) => void;
  removeTweet: (tweetId: string) => void;
  clearTweets: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useTweetsStore = create<TweetsState & TweetsActions>(
  (set, get) => ({
    tweets: [],
    isLoading: false,
    error: null,
    hasMore: true,
    lastFetchedAt: null,

    fetchTweets: async () => {
      const { isLoading } = get();
      if (isLoading) return;

      set({ isLoading: true, error: null });

      try {
        const response = await fetch("http://localhost:3000/tweets");

        if (!response.ok) {
          throw new Error("Failed to fetch tweets");
        }

        const data = await response.json();
        const tweets = data.tweets || [];

        set({
          tweets,
          isLoading: false,
          lastFetchedAt: new Date(),
          hasMore: tweets.length > 0,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "An error occurred",
          isLoading: false,
        });
      }
    },

    createTweet: async (content: string) => {
      const { session } = useAuthStore.getState();

      set({ isLoading: true, error: null });

      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch("http://localhost:3000/tweets", {
          method: "POST",
          headers,
          body: JSON.stringify({ content: content.trim() }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to create tweet");
        }

        const newTweet = await response.json();

        // Add the new tweet to the beginning of the list
        set((state) => ({
          tweets: [newTweet, ...state.tweets],
          isLoading: false,
        }));

        return { success: true, tweet: newTweet };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        set({ error: errorMessage, isLoading: false });
        return { success: false, error: errorMessage };
      }
    },

    generateFakeTweets: async () => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetch("http://localhost:3000/tweets/fake", {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Failed to generate fake tweets");
        }

        const data = await response.json();
        const tweets = data.tweets || [];

        set({
          tweets,
          isLoading: false,
          lastFetchedAt: new Date(),
          hasMore: tweets.length > 0,
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        set({ error: errorMessage, isLoading: false });
        return { success: false, error: errorMessage };
      }
    },

    likeTweet: async (tweetId: string) => {
      const { session } = useAuthStore.getState();

      try {
        const headers: HeadersInit = {};

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(
          `http://localhost:3000/tweets/${tweetId}/like`,
          {
            method: "POST",
            headers,
          }
        );

        if (response.ok) {
          set((state) => ({
            tweets: state.tweets.map((tweet) => {
              // Handle both string and ObjectId formats for comparison
              const currentTweetId =
                typeof tweet.id === "string" ? tweet.id : tweet.id?.$oid;

              return currentTweetId === tweetId
                ? {
                    ...tweet,
                    is_liked: !tweet.is_liked,
                    likes_count: tweet.likes_count + (tweet.is_liked ? -1 : 1),
                  }
                : tweet;
            }),
          }));
        }
      } catch (error) {
        console.error("Failed to like tweet:", error);
      }
    },

    unlikeTweet: async (tweetId: string) => {
      // For now, we'll use the same likeTweet function since the backend handles toggling
      await get().likeTweet(tweetId);
    },

    addTweet: (tweet: Tweet) => {
      set((state) => ({
        tweets: [tweet, ...state.tweets],
      }));
    },

    updateTweet: (tweetId: string, updates: Partial<Tweet>) => {
      set((state) => ({
        tweets: state.tweets.map((tweet) => {
          const currentTweetId =
            typeof tweet.id === "string" ? tweet.id : tweet.id?.$oid;
          return currentTweetId === tweetId ? { ...tweet, ...updates } : tweet;
        }),
      }));
    },

    removeTweet: (tweetId: string) => {
      set((state) => ({
        tweets: state.tweets.filter((tweet) => {
          const currentTweetId =
            typeof tweet.id === "string" ? tweet.id : tweet.id?.$oid;
          return currentTweetId !== tweetId;
        }),
      }));
    },

    clearTweets: () => {
      set({ tweets: [], error: null, hasMore: true, lastFetchedAt: null });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },
  })
);

// Import the auth store to avoid circular dependency
import { useAuthStore } from "./authStore";
