import { create } from "zustand";
import { api } from "../services/api";

export interface Tweet {
  _id: { $oid: string };
  content: string;
  author_id: string;
  tweet_type: "original" | "retweet" | "quote" | "reply";
  original_tweet_id?: string;
  replied_to_tweet_id?: string;
  retweet_count: number;
  like_count: number;
  reply_count: number;
  quote_count: number;
  created_at: string;
  updated_at: string;
  health: number;
  max_health: number;
  health_history: {
    health: number;
    heal_history: any[];
    attack_history: any[];
  };
  quoted_tweet?: Tweet;
  replied_to_tweet?: Tweet;
  author?: {
    _id: { $oid: string };
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface TweetsState {
  tweets: Tweet[];
  loading: boolean;
  error: string | null;

  // Quote modal state
  showQuoteModal: boolean;
  quoteTweetId: string | null;
  quoteContent: string;

  // Reply modal state
  showReplyModal: boolean;
  replyTweetId: string | null;
  replyContent: string;

  // Actions
  fetchTweets: () => Promise<void>;
  createTweet: (
    content: string,
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  quoteTweet: (
    content: string,
    originalTweetId: string,
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  retweetTweet: (
    tweetId: string,
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  replyTweet: (
    content: string,
    repliedToTweetId: string,
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  attackTweet: (
    tweetId: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  healTweet: (
    tweetId: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateTweet: (tweetId: string, updates: Partial<Tweet>) => void;
  clearError: () => void;

  // Quote modal actions
  openQuoteModal: (tweetId: string) => void;
  closeQuoteModal: () => void;
  setQuoteContent: (content: string) => void;
  clearQuoteData: () => void;

  // Reply modal actions
  openReplyModal: (tweetId: string) => void;
  closeReplyModal: () => void;
  setReplyContent: (content: string) => void;
  clearReplyData: () => void;
}

export const useTweetsStore = create<TweetsState>((set, get) => ({
  tweets: [],
  loading: false,
  error: null,

  // Quote modal state
  showQuoteModal: false,
  quoteTweetId: null,
  quoteContent: "",

  // Reply modal state
  showReplyModal: false,
  replyTweetId: null,
  replyContent: "",

  fetchTweets: async () => {
    set({ loading: true, error: null });

    try {
      const response = await api.getTweets();
      console.log("fetched tweets: ", response.tweets);
      set({ tweets: response.tweets || [], loading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch tweets";
      set({ error: errorMessage, loading: false });
    }
  },

  createTweet: async (content: string, userId: string) => {
    try {
      const newTweet = await api.createTweet(content, userId);
      const { tweets } = get();
      set({ tweets: [newTweet, ...tweets] });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create tweet";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  quoteTweet: async (
    content: string,
    originalTweetId: string,
    userId: string
  ) => {
    try {
      const newTweet = await api.quoteTweet(content, originalTweetId, userId);
      const { tweets } = get();
      set({ tweets: [newTweet, ...tweets] });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to quote tweet";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  retweetTweet: async (tweetId: string, userId: string) => {
    try {
      const newTweet = await api.retweetTweet(tweetId, userId);
      const { tweets } = get();
      set({ tweets: [newTweet, ...tweets] });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to retweet";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  replyTweet: async (
    content: string,
    repliedToTweetId: string,
    userId: string
  ) => {
    try {
      const newTweet = await api.replyTweet(content, repliedToTweetId, userId);
      const { tweets } = get();
      set({ tweets: [newTweet, ...tweets] });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reply to tweet";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  attackTweet: async (tweetId: string, amount: number) => {
    try {
      const result = await api.attackTweet(tweetId, amount);

      // Update the tweet's health in the store
      get().updateTweet(tweetId, {
        health: result.health_after,
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to attack tweet";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  healTweet: async (tweetId: string, amount: number) => {
    try {
      const result = await api.healTweet(tweetId, amount);

      // Update the tweet's health in the store
      get().updateTweet(tweetId, {
        health: result.health_after,
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to heal tweet";
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateTweet: (tweetId: string, updates: Partial<Tweet>) => {
    set((state) => ({
      tweets: state.tweets.map((tweet) =>
        tweet._id.$oid === tweetId ? { ...tweet, ...updates } : tweet
      ),
    }));
  },

  clearError: () => {
    set({ error: null });
  },

  // Quote modal actions
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

  // Reply modal actions
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
}));
