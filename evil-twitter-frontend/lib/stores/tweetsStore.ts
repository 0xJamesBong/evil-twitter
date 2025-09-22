import { create } from "zustand";
import { supabase } from "../supabase";

export interface Tweet {
  id: string | { $oid: string };
  content: string;
  tweet_type: "Original" | "Retweet" | "Quote" | "Reply";
  original_tweet_id?: string | { $oid: string };
  replied_to_tweet_id?: string | { $oid: string };
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
  health: number;
}

export interface TweetsState {
  ping_result: string | null;
  tweets: Tweet[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  lastFetchedAt: Date | null;
  // Quote tweet modal state
  showQuoteModal: boolean;
  quoteTweetId: string | null;
  quoteContent: string;
  // Reply tweet modal state
  showReplyModal: boolean;
  replyTweetId: string | null;
  replyContent: string;
}

export interface TweetsActions {
  ping: () => Promise<void>;
  fetchTweets: () => Promise<void>;
  fetchUserWall: (userId: string) => Promise<void>;
  createTweet: (
    content: string
  ) => Promise<{ success: boolean; error?: string; tweet?: Tweet }>;
  retweetTweet: (
    tweetId: string
  ) => Promise<{ success: boolean; error?: string }>;
  quoteTweet: (
    tweetId: string,
    content: string
  ) => Promise<{ success: boolean; error?: string }>;
  replyTweet: (
    tweetId: string,
    content: string
  ) => Promise<{ success: boolean; error?: string }>;
  generateFakeTweets: () => Promise<{ success: boolean; error?: string }>;
  likeTweet: (tweetId: string) => Promise<void>;
  unlikeTweet: (tweetId: string) => Promise<void>;
  healTweet: (
    tweetId: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  attackTweet: (
    tweetId: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  addTweet: (tweet: Tweet) => void;
  updateTweet: (tweetId: string, updates: Partial<Tweet>) => void;
  removeTweet: (tweetId: string) => void;
  clearTweets: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  // Quote tweet modal actions
  openQuoteModal: (tweetId: string) => void;
  closeQuoteModal: () => void;
  setQuoteContent: (content: string) => void;
  clearQuoteData: () => void;
  // Reply tweet modal actions
  openReplyModal: (tweetId: string) => void;
  closeReplyModal: () => void;
  setReplyContent: (content: string) => void;
  clearReplyData: () => void;
}

export const useTweetsStore = create<TweetsState & TweetsActions>(
  (set, get) => ({
    ping_result: null,
    tweets: [],
    isLoading: false,
    error: null,
    hasMore: true,
    lastFetchedAt: null,
    // Quote tweet modal state
    showQuoteModal: false,
    quoteTweetId: null,
    quoteContent: "",
    // Reply tweet modal state
    showReplyModal: false,
    replyTweetId: null,
    replyContent: "",
    ping: async () => {
      const response = await fetch("http://localhost:3000/ping");
      if (!response.ok) {
        throw new Error("Failed to ping backend");
      }
      const result = await response.json();
      console.log(result);
      set({ ping_result: result.message });
    },

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

    fetchUserWall: async (userId: string) => {
      const { isLoading } = get();
      if (isLoading) return;

      set({ isLoading: true, error: null });

      try {
        console.log("fetching user wall for user:", userId);
        const response = await fetch(
          `http://localhost:3000/users/${userId}/wall`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user wall");
        }

        const data = await response.json();
        const tweets = data.tweets || [];

        console.log("fetched tweets for user wall: ", tweets);

        set({
          tweets,
          isLoading: false,
          lastFetchedAt: new Date(),
          hasMore: tweets.length > 0,
        });
      } catch (error) {
        console.error("Error fetching user wall:", error);
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
        console.log("newTweet:", newTweet);

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

    healTweet: async (tweetId: string, amount: number) => {
      try {
        const response = await fetch(
          `http://localhost:3000/tweets/${tweetId}/heal`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to heal tweet",
          };
        }

        const result = await response.json();

        // Update the tweet's health in the store
        get().updateTweet(tweetId, {
          health: result.health_after,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to heal tweet:", error);
        return { success: false, error: "Failed to heal tweet" };
      }
    },

    attackTweet: async (tweetId: string, amount: number) => {
      try {
        const response = await fetch(
          `http://localhost:3000/tweets/${tweetId}/attack`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to attack tweet",
          };
        }

        const result = await response.json();

        // Update the tweet's health in the store
        get().updateTweet(tweetId, {
          health: result.health_after,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to attack tweet:", error);
        return { success: false, error: "Failed to attack tweet" };
      }
    },

    retweetTweet: async (tweetId: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return { success: false, error: "Not authenticated" };
        }

        const response = await fetch(
          `http://localhost:3000/tweets/${tweetId}/retweet`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to retweet",
          };
        }

        const retweet = await response.json();
        get().addTweet(retweet);

        // Update the original tweet's retweet count
        get().updateTweet(tweetId, {
          retweets_count:
            (get().tweets.find((t) => {
              const currentId = typeof t.id === "string" ? t.id : t.id?.$oid;
              return currentId === tweetId;
            })?.retweets_count || 0) + 1,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to retweet:", error);
        return { success: false, error: "Failed to retweet" };
      }
    },

    quoteTweet: async (tweetId: string, content: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return { success: false, error: "Not authenticated" };
        }

        const response = await fetch(
          `http://localhost:3000/tweets/${tweetId}/quote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to quote tweet",
          };
        }

        const quoteTweet = await response.json();
        get().addTweet(quoteTweet);

        // Update the original tweet's retweet count
        get().updateTweet(tweetId, {
          retweets_count:
            (get().tweets.find((t) => {
              const currentId = typeof t.id === "string" ? t.id : t.id?.$oid;
              return currentId === tweetId;
            })?.retweets_count || 0) + 1,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to quote tweet:", error);
        return { success: false, error: "Failed to quote tweet" };
      }
    },

    replyTweet: async (tweetId: string, content: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          return { success: false, error: "Not authenticated" };
        }

        const response = await fetch(
          `http://localhost:3000/tweets/${tweetId}/reply`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ content, replied_to_tweet_id: tweetId }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to reply to tweet",
          };
        }

        const replyTweet = await response.json();
        get().addTweet(replyTweet);

        // Update the original tweet's reply count
        get().updateTweet(tweetId, {
          replies_count:
            (get().tweets.find((t) => {
              const currentId = typeof t.id === "string" ? t.id : t.id?.$oid;
              return currentId === tweetId;
            })?.replies_count || 0) + 1,
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to reply to tweet:", error);
        return { success: false, error: "Failed to reply to tweet" };
      }
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

    // Quote tweet modal actions
    openQuoteModal: (tweetId: string) => {
      set({
        showQuoteModal: true,
        quoteTweetId: tweetId,
        quoteContent: "",
      });
    },

    closeQuoteModal: () => {
      set({
        showQuoteModal: false,
        quoteTweetId: null,
        quoteContent: "",
      });
    },

    setQuoteContent: (content: string) => {
      set({ quoteContent: content });
    },

    clearQuoteData: () => {
      set({
        showQuoteModal: false,
        quoteTweetId: null,
        quoteContent: "",
      });
    },

    // Reply tweet modal actions
    openReplyModal: (tweetId: string) => {
      set({
        showReplyModal: true,
        replyTweetId: tweetId,
        replyContent: "",
      });
    },

    closeReplyModal: () => {
      set({
        showReplyModal: false,
        replyTweetId: null,
        replyContent: "",
      });
    },

    setReplyContent: (content: string) => {
      set({ replyContent: content });
    },

    clearReplyData: () => {
      set({
        showReplyModal: false,
        replyTweetId: null,
        replyContent: "",
      });
    },
  })
);

// Import the auth store to avoid circular dependency
import { useAuthStore } from "./authStore";
