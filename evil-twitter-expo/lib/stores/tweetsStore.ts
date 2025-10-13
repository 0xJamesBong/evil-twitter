import { create } from "zustand";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type ObjectIdRef = { $oid: string };

export type TweetType = "original" | "retweet" | "quote" | "reply";

export interface TweetMetrics {
  likes: number;
  retweets: number;
  quotes: number;
  replies: number;
  impressions: number;
}

export interface TweetAuthorSnapshot {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface TweetAuthor {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface TweetViewerContext {
  is_liked: boolean;
  is_retweeted: boolean;
  is_quoted: boolean;
}

export interface TweetHealthAction {
  timestamp: string;
  amount: number;
  health_before: number;
  health_after: number;
}

export interface TweetHealthHistory {
  heal_history: TweetHealthAction[];
  attack_history: TweetHealthAction[];
}

export interface TweetHealthState {
  current: number;
  max: number;
  history: TweetHealthHistory;
}

export interface TweetViralitySnapshot {
  score: number;
  momentum: number;
  health_multiplier: number;
}

export interface Tweet {
  _id: ObjectIdRef;
  owner_id: ObjectIdRef;
  content: string;
  tweet_type: TweetType;
  quoted_tweet_id?: ObjectIdRef;
  replied_to_tweet_id?: ObjectIdRef;
  root_tweet_id?: ObjectIdRef;
  reply_depth: number;
  created_at: string;
  updated_at?: string;
  metrics: TweetMetrics;
  author_snapshot: TweetAuthorSnapshot;
  author?: TweetAuthor;
  viewer_context: TweetViewerContext;
  health: TweetHealthState;
  virality: TweetViralitySnapshot;
  quoted_tweet?: Tweet;
  replied_to_tweet?: Tweet;
  author_display_name?: string;
  author_username?: string;
  author_avatar_url?: string | null;
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  quote_count: number;
  max_health: number;
}

interface TweetListResponse {
  tweets: any[];
  total: number;
}

const getAuthHeaders = async (
  includeJson: boolean = true
): Promise<Record<string, string>> => {
  const { supabase } = await import("../supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && data.error) ||
      response.statusText ||
      "Request failed";
    throw new Error(String(message));
  }

  return (data ?? {}) as T;
};

function normalizeTweet(raw: any): Tweet {
  if (!raw) {
    throw new Error("Cannot normalise empty tweet payload");
  }

  const metrics: TweetMetrics = {
    likes: raw.metrics?.likes ?? raw.likes_count ?? 0,
    retweets: raw.metrics?.retweets ?? raw.retweets_count ?? 0,
    quotes: raw.metrics?.quotes ?? raw.quote_count ?? 0,
    replies: raw.metrics?.replies ?? raw.replies_count ?? 0,
    impressions: raw.metrics?.impressions ?? 0,
  };

  const rawHistory = raw.health?.history ?? {};
  const health: TweetHealthState = {
    current: raw.health?.current ?? raw.health ?? 100,
    max: raw.health?.max ?? raw.max_health ?? 100,
    history: {
      heal_history: rawHistory.heal_history ?? [],
      attack_history: rawHistory.attack_history ?? [],
    },
  };

  const author_snapshot: TweetAuthorSnapshot = {
    username: raw.author_snapshot?.username ?? raw.author_username ?? undefined,
    display_name:
      raw.author_snapshot?.display_name ?? raw.author_display_name ?? undefined,
    avatar_url:
      raw.author_snapshot?.avatar_url ?? raw.author_avatar_url ?? undefined,
  };

  const author: TweetAuthor = {
    username: author_snapshot.username ?? null,
    display_name: author_snapshot.display_name ?? null,
    avatar_url: author_snapshot.avatar_url ?? null,
  };

  const viewer_context: TweetViewerContext = {
    is_liked: raw.viewer_context?.is_liked ?? raw.is_liked ?? false,
    is_retweeted: raw.viewer_context?.is_retweeted ?? raw.is_retweeted ?? false,
    is_quoted: raw.viewer_context?.is_quoted ?? false,
  };

  const virality: TweetViralitySnapshot = {
    score: raw.virality?.score ?? 0,
    momentum: raw.virality?.momentum ?? 0,
    health_multiplier: raw.virality?.health_multiplier ?? 1,
  };

  const normalized: Tweet = {
    ...raw,
    tweet_type: (raw.tweet_type ?? "original")
      .toString()
      .toLowerCase() as TweetType,
    metrics,
    author_snapshot,
    author,
    viewer_context,
    health,
    virality,
    quoted_tweet: raw.quoted_tweet
      ? normalizeTweet(raw.quoted_tweet)
      : undefined,
    replied_to_tweet: raw.replied_to_tweet
      ? normalizeTweet(raw.replied_to_tweet)
      : undefined,
    author_display_name: author.display_name ?? undefined,
    author_username: author.username ?? undefined,
    author_avatar_url: author.avatar_url ?? undefined,
    likes_count: metrics.likes,
    retweets_count: metrics.retweets,
    replies_count: metrics.replies,
    quote_count: metrics.quotes,
    max_health: health.max,
  };

  return normalized;
}

const normalizeTweetList = (rawTweets: any[] | undefined): Tweet[] =>
  (rawTweets ?? []).map(normalizeTweet);

interface TweetsState {
  tweets: Tweet[];
  loading: boolean;
  error: string | null;

  showQuoteModal: boolean;
  quoteTweetId: string | null;
  quoteContent: string;

  showReplyModal: boolean;
  replyTweetId: string | null;
  replyContent: string;

  threads: Record<string, Tweet[]>;
  threadLoading: boolean;
  threadError: string | null;

  showReplyThreadModal: boolean;
  replyThreadTweetId: string | null;

  fetchTweets: () => Promise<void>;
  fetchTweet: (tweetId: string) => Promise<Tweet | null>;
  createTweet: (
    content: string
  ) => Promise<{ success: boolean; error?: string }>;
  quoteTweet: (
    content: string,
    quotedTweetId: string
  ) => Promise<{ success: boolean; error?: string }>;
  retweetTweet: (
    tweetId: string
  ) => Promise<{ success: boolean; error?: string }>;
  replyTweet: (
    content: string,
    repliedToTweetId: string
  ) => Promise<{ success: boolean; error?: string }>;
  attackTweet: (
    tweetId: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  healTweet: (
    tweetId: string,
    amount: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateTweet: (tweetId: string, updater: (tweet: Tweet) => Tweet) => void;
  clearError: () => void;

  openQuoteModal: (tweetId: string) => void;
  closeQuoteModal: () => void;
  setQuoteContent: (content: string) => void;
  clearQuoteData: () => void;

  openReplyModal: (tweetId: string) => void;
  closeReplyModal: () => void;
  setReplyContent: (content: string) => void;
  clearReplyData: () => void;

  fetchThread: (
    tweetId: string,
    limit?: number,
    offset?: number
  ) => Promise<void>;
  clearThread: (tweetId: string) => void;
  clearAllThreads: () => void;

  openReplyThreadModal: (tweetId: string) => void;
  closeReplyThreadModal: () => void;
}

export const useTweetsStore = create<TweetsState>((set, get) => ({
  tweets: [],
  loading: false,
  error: null,

  showQuoteModal: false,
  quoteTweetId: null,
  quoteContent: "",

  showReplyModal: false,
  replyTweetId: null,
  replyContent: "",

  threads: {},
  threadLoading: false,
  threadError: null,

  showReplyThreadModal: false,
  replyThreadTweetId: null,

  fetchTweets: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/tweets`);
      const data = await parseJson<TweetListResponse>(response);
      const tweets = normalizeTweetList(data.tweets);
      set({ tweets, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch tweets",
        loading: false,
      });
    }
  },

  fetchTweet: async (tweetId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}`);
      const data = await parseJson<any>(response);
      return normalizeTweet(data);
    } catch (error) {
      console.error("Failed to fetch tweet:", error);
      return null;
    }
  },

  createTweet: async (content: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/tweets`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
      });
      const data = await parseJson<any>(response);
      const newTweet = normalizeTweet(data);
      set((state) => ({
        tweets: [newTweet, ...state.tweets],
      }));
      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create tweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  quoteTweet: async (content: string, quotedTweetId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/tweets/${quotedTweetId}/quote`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ content }),
        }
      );
      const data = await parseJson<any>(response);
      const newTweet = normalizeTweet(data);
      set((state) => ({
        tweets: [newTweet, ...state.tweets],
      }));

      get().updateTweet(quotedTweetId, (tweet) => ({
        ...tweet,
        metrics: {
          ...tweet.metrics,
          quotes: tweet.metrics.quotes + 1,
        },
        quote_count: tweet.quote_count + 1,
      }));

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to quote tweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  retweetTweet: async (tweetId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/tweets/${tweetId}/retweet`,
        {
          method: "POST",
          headers,
        }
      );
      const data = await parseJson<any>(response);
      const newTweet = normalizeTweet(data);
      set((state) => ({
        tweets: [newTweet, ...state.tweets],
      }));

      get().updateTweet(tweetId, (tweet) => ({
        ...tweet,
        metrics: {
          ...tweet.metrics,
          retweets: tweet.metrics.retweets + 1,
        },
        retweets_count: tweet.retweets_count + 1,
      }));

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  replyTweet: async (content: string, repliedToTweetId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/tweets/${repliedToTweetId}/reply`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ content }),
        }
      );
      const data = await parseJson<any>(response);
      const newTweet = normalizeTweet(data);
      set((state) => ({
        tweets: [newTweet, ...state.tweets],
      }));

      get().updateTweet(repliedToTweetId, (tweet) => ({
        ...tweet,
        metrics: {
          ...tweet.metrics,
          replies: tweet.metrics.replies + 1,
        },
        replies_count: tweet.replies_count + 1,
      }));

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reply to tweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  attackTweet: async (tweetId: string, amount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });
      const data = await parseJson<any>(response);

      get().updateTweet(tweetId, (tweet) => ({
        ...tweet,
        health: {
          ...tweet.health,
          current: data.health_after ?? tweet.health.current,
        },
      }));

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to attack tweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  healTweet: async (tweetId: string, amount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/heal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });
      const data = await parseJson<any>(response);

      get().updateTweet(tweetId, (tweet) => ({
        ...tweet,
        health: {
          ...tweet.health,
          current: data.health_after ?? tweet.health.current,
        },
      }));

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to heal tweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  updateTweet: (tweetId: string, updater: (tweet: Tweet) => Tweet) => {
    set((state) => {
      const updateCollection = (collection: Tweet[]) =>
        collection.map((tweet) =>
          tweet._id.$oid === tweetId ? updater(tweet) : tweet
        );

      const updatedThreads = Object.entries(state.threads).reduce<
        Record<string, Tweet[]>
      >((acc, [id, list]) => {
        acc[id] = updateCollection(list);
        return acc;
      }, {});

      return {
        tweets: updateCollection(state.tweets),
        threads: updatedThreads,
      };
    });
  },

  clearError: () => {
    set({ error: null });
  },

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

  fetchThread: async (
    tweetId: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    set((state) => ({
      threadLoading: true,
      threadError: null,
      threads: {
        ...state.threads,
        [tweetId]: state.threads[tweetId] ?? [],
      },
    }));

    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(
        `${API_BASE_URL}/tweets/${tweetId}/thread?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers,
        }
      );
      const data = await parseJson<TweetListResponse>(response);
      const normalizedTweets = normalizeTweetList(data.tweets);

      set((state) => ({
        threads: {
          ...state.threads,
          [tweetId]: normalizedTweets,
        },
        threadLoading: false,
      }));
    } catch (error) {
      set({
        threadError:
          error instanceof Error ? error.message : "Failed to fetch thread",
        threadLoading: false,
      });
    }
  },

  clearThread: (tweetId: string) => {
    set((state) => {
      const threads = { ...state.threads };
      delete threads[tweetId];
      return { threads };
    });
  },

  clearAllThreads: () => {
    set({ threads: {}, threadLoading: false, threadError: null });
  },

  openReplyThreadModal: (tweetId: string) => {
    set({
      showReplyThreadModal: true,
      replyThreadTweetId: tweetId,
    });
  },

  closeReplyThreadModal: () => {
    set({
      showReplyThreadModal: false,
      replyThreadTweetId: null,
    });
  },
}));
