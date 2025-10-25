import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

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

export interface ToolSnapshot {
  _id?: ObjectIdRef;
  name?: string;
  image_url?: string;
  impact?: number;
  tool_type?: string;
}

export interface TweetEnergyAction {
  timestamp: string;
  impact: number;
  user_id: ObjectIdRef;
  tool?: ToolSnapshot | null;
}

export interface TweetEnergyStateHistory {
  support_history: TweetEnergyAction[];
  attack_history: TweetEnergyAction[];
}

export interface TweetEnergyState {
  energy: number;
  kinetic_energy: number;
  potential_energy: number;
  energy_gained_from_support: number;
  energy_lost_from_attacks: number;
  mass: number;
  velocity_initial: number;
  height_initial: number;
  last_update_timestamp: string;
  history: TweetEnergyStateHistory;
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
  energy_state: TweetEnergyState;
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
}

export interface ThreadApiResponse {
  tweet: any;
  parents: any[];
  replies: any[];
}

export interface ThreadData {
  tweet: Tweet;
  parents: Tweet[];
  replies: Tweet[];
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

const flattenTweetPayload = (raw: any) => {
  if (raw && typeof raw === "object" && "tweet" in raw && raw.tweet) {
    const { tweet, ...rest } = raw;
    return { ...tweet, ...rest };
  }
  return raw;
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
  const base = flattenTweetPayload(raw);

  if (!base) {
    throw new Error("Cannot normalise empty tweet payload");
  }

  const metrics: TweetMetrics = {
    likes: base.metrics?.likes ?? base.likes_count ?? 0,
    retweets: base.metrics?.retweets ?? base.retweets_count ?? 0,
    quotes: base.metrics?.quotes ?? base.quote_count ?? 0,
    replies: base.metrics?.replies ?? base.replies_count ?? 0,
    impressions: base.metrics?.impressions ?? 0,
  };

  const rawEnergy = base.energy_state ?? {};
  const energy_state: TweetEnergyState = {
    energy: rawEnergy.energy ?? 0,
    kinetic_energy: rawEnergy.kinetic_energy ?? 0,
    potential_energy: rawEnergy.potential_energy ?? 0,
    energy_gained_from_support: rawEnergy.energy_gained_from_support ?? 0,
    energy_lost_from_attacks: rawEnergy.energy_lost_from_attacks ?? 0,
    mass: rawEnergy.mass ?? 0,
    velocity_initial: rawEnergy.velocity_initial ?? 0,
    height_initial: rawEnergy.height_initial ?? 0,
    last_update_timestamp:
      rawEnergy.last_update_timestamp ?? new Date().toISOString(),
    history: {
      support_history: (rawEnergy.history?.support_history ?? []).map(
        (entry: any) => ({
          timestamp: entry.timestamp ?? new Date().toISOString(),
          impact: entry.impact ?? 0,
          user_id: entry.user_id ?? { $oid: "" },
          tool: entry.tool ?? null,
        })
      ),
      attack_history: (rawEnergy.history?.attack_history ?? []).map(
        (entry: any) => ({
          timestamp: entry.timestamp ?? new Date().toISOString(),
          impact: entry.impact ?? 0,
          user_id: entry.user_id ?? { $oid: "" },
          tool: entry.tool ?? null,
        })
      ),
    },
  };

  const author_snapshot: TweetAuthorSnapshot = {
    username:
      base.author_snapshot?.username ?? base.author_username ?? undefined,
    display_name:
      base.author_snapshot?.display_name ??
      base.author_display_name ??
      undefined,
    avatar_url:
      base.author_snapshot?.avatar_url ?? base.author_avatar_url ?? undefined,
  };

  const author: TweetAuthor = {
    username: author_snapshot.username ?? null,
    display_name: author_snapshot.display_name ?? null,
    avatar_url: author_snapshot.avatar_url ?? null,
  };

  const viewer_context: TweetViewerContext = {
    is_liked: base.viewer_context?.is_liked ?? base.is_liked ?? false,
    is_retweeted:
      base.viewer_context?.is_retweeted ?? base.is_retweeted ?? false,
    is_quoted: base.viewer_context?.is_quoted ?? false,
  };

  const virality: TweetViralitySnapshot = {
    score: base.virality?.score ?? 0,
    momentum: base.virality?.momentum ?? 0,
    health_multiplier: base.virality?.health_multiplier ?? 1,
  };

  const normalized: Tweet = {
    ...base,
    tweet_type: (base.tweet_type ?? "original")
      .toString()
      .toLowerCase() as TweetType,
    metrics,
    author_snapshot,
    author,
    viewer_context,
    energy_state,
    virality,
    quoted_tweet: base.quoted_tweet
      ? normalizeTweet(base.quoted_tweet)
      : undefined,
    replied_to_tweet: base.replied_to_tweet
      ? normalizeTweet(base.replied_to_tweet)
      : undefined,
    author_display_name: author.display_name ?? undefined,
    author_username: author.username ?? undefined,
    author_avatar_url: author.avatar_url ?? undefined,
    likes_count: metrics.likes,
    retweets_count: metrics.retweets,
    replies_count: metrics.replies,
    quote_count: metrics.quotes,
  };

  return normalized;
}

const normalizeTweetList = (rawTweets: any[] | undefined): Tweet[] =>
  (rawTweets ?? []).map(normalizeTweet);

interface TweetsState {
  tweets: Tweet[];
  userTweets: Tweet[];
  loading: boolean;
  error: string | null;

  showQuoteModal: boolean;
  quoteTweetId: string | null;
  quoteContent: string;

  showReplyModal: boolean;
  replyTweetId: string | null;
  replyContent: string;

  threads: Record<string, ThreadData>;
  threadLoading: boolean;
  threadError: string | null;

  showReplyThreadModal: boolean;
  replyThreadTweetId: string | null;

  fetchTweets: () => Promise<void>;
  fetchUserTweets: (userId: string) => Promise<void>;
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
    toolId: string
  ) => Promise<{ success: boolean; error?: string }>;
  supportTweet: (
    tweetId: string,
    toolId: string
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

  fetchThread: (tweetId: string) => Promise<void>;
  clearThread: (tweetId: string) => void;
  clearAllThreads: () => void;

  openReplyThreadModal: (tweetId: string) => void;
  closeReplyThreadModal: () => void;
}

export const useTweetsStore = create<TweetsState>((set, get) => ({
  tweets: [],
  userTweets: [],
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

  fetchUserTweets: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/wall`);
      const data = await parseJson<TweetListResponse>(response);
      const userTweets = normalizeTweetList(data.tweets);
      set({ userTweets, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch user tweets",
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

      set((state) => {
        const updatedThreads: Record<string, ThreadData> = {
          ...state.threads,
        };

        const rootId = newTweet.root_tweet_id?.$oid;
        const keysToUpdate = new Set<string>();
        if (rootId) {
          keysToUpdate.add(rootId);
        }
        keysToUpdate.add(repliedToTweetId);

        keysToUpdate.forEach((key) => {
          const thread = updatedThreads[key];
          if (!thread) {
            return;
          }

          const nextReplies = [...thread.replies].filter(
            (tweet) => tweet._id.$oid !== newTweet._id.$oid
          );
          nextReplies.push(newTweet);
          nextReplies.sort((a, b) => {
            if (a.reply_depth === b.reply_depth) {
              return (
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
              );
            }
            return (a.reply_depth ?? 0) - (b.reply_depth ?? 0);
          });

          updatedThreads[key] = {
            ...thread,
            replies: nextReplies,
          };
        });

        return {
          tweets: [newTweet, ...state.tweets],
          threads: updatedThreads,
        };
      });

      get().updateTweet(repliedToTweetId, (tweet) => ({
        ...tweet,
        metrics: {
          ...tweet.metrics,
          replies: tweet.metrics.replies + 1,
        },
        replies_count: tweet.replies_count + 1,
      }));

      const rootTweetId = newTweet.root_tweet_id?.$oid;
      if (rootTweetId && rootTweetId !== repliedToTweetId) {
        get().updateTweet(rootTweetId, (tweet) => ({
          ...tweet,
          metrics: {
            ...tweet.metrics,
            replies: tweet.metrics.replies + 1,
          },
          replies_count: tweet.replies_count + 1,
        }));
      }

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reply to tweet";
      set({ error: message });
      return { success: false, error: message };
    }
  },

  attackTweet: async (tweetId: string, toolId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/attack`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tool_id: toolId }),
      });
      const data = await parseJson<any>(response);

      get().updateTweet(tweetId, (tweet) => ({
        ...tweet,
        energy_state: {
          ...tweet.energy_state,
          energy: data.energy_after ?? tweet.energy_state.energy,
          energy_lost_from_attacks:
            tweet.energy_state.energy_lost_from_attacks + (data.damage ?? 0),
          last_update_timestamp: new Date().toISOString(),
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

  supportTweet: async (tweetId: string, toolId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/tweets/${tweetId}/support`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ tool_id: toolId }),
        }
      );
      const data = await parseJson<any>(response);

      get().updateTweet(tweetId, (tweet) => ({
        ...tweet,
        energy_state: {
          ...tweet.energy_state,
          energy: data.energy_after ?? tweet.energy_state.energy,
          energy_gained_from_support:
            tweet.energy_state.energy_gained_from_support + (data.support ?? 0),
          last_update_timestamp: new Date().toISOString(),
        },
      }));

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to support tweet";
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
        Record<string, ThreadData>
      >((acc, [id, thread]) => {
        const updatedThread: ThreadData = {
          tweet:
            thread.tweet._id.$oid === tweetId
              ? updater(thread.tweet)
              : thread.tweet,
          parents: updateCollection(thread.parents),
          replies: updateCollection(thread.replies),
        };
        acc[id] = updatedThread;
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

  fetchThread: async (tweetId: string) => {
    set({
      threadLoading: true,
      threadError: null,
    });
    try {
      const headers = await getAuthHeaders(false);
      const response = await fetch(`${API_BASE_URL}/tweets/${tweetId}/thread`, {
        method: "GET",
        headers,
      });
      const data = await parseJson<ThreadApiResponse>(response);
      const normalizedThread: ThreadData = {
        tweet: normalizeTweet(data.tweet),
        parents: normalizeTweetList(data.parents),
        replies: normalizeTweetList(data.replies),
      };

      set((state) => ({
        threads: {
          ...state.threads,
          [tweetId]: normalizedThread,
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
