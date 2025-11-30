import { create } from "zustand";
import { graphqlRequest } from "../graphql/client";
import {
  TWEET_CREATE_MUTATION,
  TWEET_REPLY_MUTATION,
  TWEET_QUOTE_MUTATION,
  TWEET_RETWEET_MUTATION,
  TWEET_LIKE_MUTATION,
  TWEET_VOTE_MUTATION,
  TweetCreateInput,
  TweetCreateResult,
  TweetReplyInput,
  TweetReplyResult,
  TweetQuoteInput,
  TweetQuoteResult,
  TweetRetweetResult,
  TweetLikeResult,
  TweetVoteInput,
  TweetVoteResult,
} from "../graphql/tweets/mutations";
import {
  TIMELINE_QUERY,
  TWEET_QUERY,
  TWEET_THREAD_QUERY,
  TimelineQueryResult,
  TweetQueryResult,
  TweetThreadQueryResult,
} from "../graphql/tweets/queries";
import { TweetNode } from "../graphql/tweets/types";

// ============================================================================
// Thread Data Structure
// ============================================================================

export interface ThreadData {
  tweet: TweetNode;
  parents: TweetNode[];
  replies: TweetNode[];
}

// ============================================================================
// Store State & Actions
// ============================================================================

type TweetStoreState = {
  // Data
  tweets: TweetNode[];
  userTweets: TweetNode[];
  threads: Record<string, ThreadData>;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  threadLoading: boolean;

  // Error states
  error: string | null;
  threadError: string | null;

  // Modal states
  showQuoteModal: boolean;
  quoteTweetId: string | null;
  quoteContent: string;

  showReplyModal: boolean;
  replyTweetId: string | null;
  replyContent: string;

  showReplyThreadModal: boolean;
  replyThreadTweetId: string | null;
};

type TweetStoreActions = {
  // Fetch operations
  fetchTimeline: (
    identityToken?: string,
    first?: number,
    after?: string
  ) => Promise<void>;
  fetchTweet: (
    identityToken: string | undefined,
    tweetId: string
  ) => Promise<TweetNode | null>;
  fetchUserTweets: (identityToken: string, userId: string) => Promise<void>;
  fetchThread: (
    identityToken: string | undefined,
    tweetId: string
  ) => Promise<void>;

  // Mutation operations
  createTweet: (
    identityToken: string,
    content: string
  ) => Promise<{ tweet: TweetNode; onchainSignature?: string | null }>;
  replyTweet: (
    identityToken: string,
    content: string,
    repliedToTweetId: string
  ) => Promise<TweetNode>;
  quoteTweet: (
    identityToken: string,
    content: string,
    quotedTweetId: string
  ) => Promise<TweetNode>;
  retweetTweet: (identityToken: string, tweetId: string) => Promise<TweetNode>;
  likeTweet: (
    identityToken: string,
    tweetId: string
  ) => Promise<{ liked: boolean; likeCount: number }>;
  voteOnTweet: (
    identityToken: string,
    tweetId: string,
    side: "pump" | "smack",
    votes: number,
    tokenMint?: string
  ) => Promise<void>;

  // Utility operations
  addTweetToTimeline: (tweet: TweetNode) => void;
  updateTweetInStore: (
    tweetId: string,
    updater: (tweet: TweetNode) => TweetNode
  ) => void;
  setUserTweets: (tweets: TweetNode[]) => void;
  clearError: () => void;
  clearTweets: () => void;
  clearThread: (tweetId: string) => void;
  clearAllThreads: () => void;

  // Modal operations
  openQuoteModal: (tweetId: string) => void;
  closeQuoteModal: () => void;
  setQuoteContent: (content: string) => void;
  clearQuoteData: () => void;

  openReplyModal: (tweetId: string) => void;
  closeReplyModal: () => void;
  setReplyContent: (content: string) => void;
  clearReplyData: () => void;

  openReplyThreadModal: (tweetId: string) => void;
  closeReplyThreadModal: () => void;
};

export const useTweetStore = create<TweetStoreState & TweetStoreActions>(
  (set, get) => ({
    // Initial state
    tweets: [],
    userTweets: [],
    threads: {},
    isLoading: false,
    isCreating: false,
    threadLoading: false,
    error: null,
    threadError: null,
    showQuoteModal: false,
    quoteTweetId: null,
    quoteContent: "",
    showReplyModal: false,
    replyTweetId: null,
    replyContent: "",
    showReplyThreadModal: false,
    replyThreadTweetId: null,

    // ========================================================================
    // Fetch Operations
    // ========================================================================

    fetchTimeline: async (
      identityToken?: string,
      first: number = 20,
      after?: string
    ) => {
      set({ isLoading: true, error: null });
      try {
        const data = await graphqlRequest<TimelineQueryResult>(
          TIMELINE_QUERY,
          { first, after: after || "" },
          identityToken
        );

        const tweets = data.timeline.edges.map((edge) => edge.node);
        set({ tweets, isLoading: false });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch timeline";
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    fetchTweet: async (identityToken: string | undefined, tweetId: string) => {
      try {
        const data = await graphqlRequest<TweetQueryResult>(
          TWEET_QUERY,
          { id: tweetId },
          identityToken
        );

        if (data.tweet) {
          return data.tweet;
        }
        return null;
      } catch (error) {
        console.error("Failed to fetch tweet:", error);
        return null;
      }
    },

    fetchUserTweets: async (identityToken: string, userId: string) => {
      set({ isLoading: true, error: null });
      try {
        // TODO: Implement user tweets query when available
        // For now, this is a placeholder
        set({ userTweets: [], isLoading: false });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch user tweets";
        set({ error: errorMessage, isLoading: false });
        throw error;
      }
    },

    fetchThread: async (identityToken: string | undefined, tweetId: string) => {
      set({ threadLoading: true, threadError: null });
      try {
        const data = await graphqlRequest<TweetThreadQueryResult>(
          TWEET_THREAD_QUERY,
          { tweetId },
          identityToken
        );

        if (!data.tweetThread) {
          throw new Error("Tweet thread not found");
        }

        const threadData: ThreadData = {
          tweet: data.tweetThread.tweet,
          parents: data.tweetThread.parents,
          replies: data.tweetThread.replies,
        };

        set((state) => ({
          threads: {
            ...state.threads,
            [tweetId]: threadData,
          },
          threadLoading: false,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch thread";
        set({ threadError: errorMessage, threadLoading: false });
        throw error;
      }
    },

    // ========================================================================
    // Mutation Operations
    // ========================================================================

    createTweet: async (identityToken: string, content: string) => {
      set({ isCreating: true, error: null });
      try {
        console.log(
          "📝 createTweet: trying to create tweet with content:",
          content
        );
        const input: TweetCreateInput = { content: content.trim() };
        const data = await graphqlRequest<TweetCreateResult>(
          TWEET_CREATE_MUTATION,
          { input },
          identityToken
        );

        const newTweet = data.tweetCreate.tweet;
        const onchainSignature = data.tweetCreate.onchainSignature;

        // Optimistic update: add to timeline
        set((state) => ({
          tweets: [newTweet, ...state.tweets],
          isCreating: false,
        }));

        // Note: On-chain post creation is handled automatically by the backend
        // in the GraphQL mutation resolver, so no frontend call is needed here

        return { tweet: newTweet, onchainSignature };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create tweet";
        set({ error: errorMessage, isCreating: false });
        throw error;
      }
    },

    replyTweet: async (
      identityToken: string,
      content: string,
      repliedToTweetId: string
    ) => {
      set({ isCreating: true, error: null });
      try {
        const input: TweetReplyInput = {
          content: content.trim(),
          repliedToId: repliedToTweetId,
        };
        const data = await graphqlRequest<TweetReplyResult>(
          TWEET_REPLY_MUTATION,
          { input },
          identityToken
        );

        const newTweet = data.tweetReply.tweet;

        // Optimistic update: add to timeline
        set((state) => ({
          tweets: [newTweet, ...state.tweets],
          isCreating: false,
        }));

        // Update reply counts in threads if applicable
        const rootTweetId = newTweet.rootTweetId;
        if (rootTweetId) {
          get().updateTweetInStore(rootTweetId, (tweet) => ({
            ...tweet,
            metrics: {
              ...tweet.metrics,
              replies: tweet.metrics.replies + 1,
            },
          }));
        }

        get().updateTweetInStore(repliedToTweetId, (tweet) => ({
          ...tweet,
          metrics: {
            ...tweet.metrics,
            replies: tweet.metrics.replies + 1,
          },
        }));

        return newTweet;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to reply to tweet";
        set({ error: errorMessage, isCreating: false });
        throw error;
      }
    },

    quoteTweet: async (
      identityToken: string,
      content: string,
      quotedTweetId: string
    ) => {
      set({ isCreating: true, error: null });
      try {
        const input: TweetQuoteInput = {
          content: content.trim(),
          quotedTweetId: quotedTweetId,
        };
        const data = await graphqlRequest<TweetQuoteResult>(
          TWEET_QUOTE_MUTATION,
          { input },
          identityToken
        );

        const newTweet = data.tweetQuote.tweet;

        // Optimistic update: add to timeline
        set((state) => ({
          tweets: [newTweet, ...state.tweets],
          isCreating: false,
        }));

        // Update quote count
        get().updateTweetInStore(quotedTweetId, (tweet) => ({
          ...tweet,
          metrics: {
            ...tweet.metrics,
            quotes: tweet.metrics.quotes + 1,
          },
        }));

        return newTweet;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to quote tweet";
        set({ error: errorMessage, isCreating: false });
        throw error;
      }
    },

    retweetTweet: async (identityToken: string, tweetId: string) => {
      set({ isCreating: true, error: null });
      try {
        const data = await graphqlRequest<TweetRetweetResult>(
          TWEET_RETWEET_MUTATION,
          { id: tweetId },
          identityToken
        );

        const newTweet = data.tweetRetweet.tweet;

        // Optimistic update: add to timeline
        set((state) => ({
          tweets: [newTweet, ...state.tweets],
          isCreating: false,
        }));

        // Update retweet count
        get().updateTweetInStore(tweetId, (tweet) => ({
          ...tweet,
          metrics: {
            ...tweet.metrics,
            retweets: tweet.metrics.retweets + 1,
          },
        }));

        return newTweet;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to retweet";
        set({ error: errorMessage, isCreating: false });
        throw error;
      }
    },

    likeTweet: async (identityToken: string, tweetId: string) => {
      try {
        const data = await graphqlRequest<TweetLikeResult>(
          TWEET_LIKE_MUTATION,
          {
            id: tweetId,
            idempotencyKey: `like-${tweetId}-${Date.now()}`,
          },
          identityToken
        );

        // Update tweet in store
        get().updateTweetInStore(tweetId, (tweet) => ({
          ...tweet,
          metrics: {
            ...tweet.metrics,
            likes: data.tweetLike.likeCount,
          },
        }));

        return {
          liked: data.tweetLike.likedByViewer,
          likeCount: data.tweetLike.likeCount,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to like tweet";
        set({ error: errorMessage });
        throw error;
      }
    },

    voteOnTweet: async (
      identityToken: string,
      tweetId: string,
      side: "pump" | "smack",
      votes: number,
      tokenMint?: string
    ) => {
      try {
        const input: TweetVoteInput = {
          tweetId,
          side,
          votes,
          tokenMint,
        };

        const data = await graphqlRequest<TweetVoteResult>(
          TWEET_VOTE_MUTATION,
          { input },
          identityToken
        );

        // Update tweet in store with new vote counts
        // Note: The backend returns updated metrics, but postState should be refetched
        get().updateTweetInStore(tweetId, (tweet) => ({
          ...tweet,
          metrics: {
            ...tweet.metrics,
            likes: data.tweetVote.likeCount,
            smacks: data.tweetVote.smackCount,
          },
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to vote on tweet";
        set({ error: errorMessage });
        throw error;
      }
    },

    // ========================================================================
    // Utility Operations
    // ========================================================================

    addTweetToTimeline: (tweet: TweetNode) => {
      set((state) => ({
        tweets: [tweet, ...state.tweets],
      }));
    },

    updateTweetInStore: (
      tweetId: string,
      updater: (tweet: TweetNode) => TweetNode
    ) => {
      set((state) => {
        const updateInArray = (tweets: TweetNode[]) =>
          tweets.map((tweet) =>
            tweet.id === tweetId ? updater(tweet) : tweet
          );

        const updatedThreads = Object.entries(state.threads).reduce<
          Record<string, ThreadData>
        >((acc, [id, thread]) => {
          acc[id] = {
            tweet:
              thread.tweet.id === tweetId
                ? updater(thread.tweet)
                : thread.tweet,
            parents: updateInArray(thread.parents),
            replies: updateInArray(thread.replies),
          };
          return acc;
        }, {});

        return {
          tweets: updateInArray(state.tweets),
          userTweets: updateInArray(state.userTweets),
          threads: updatedThreads,
        };
      });
    },

    setUserTweets: (tweets: TweetNode[]) => {
      set({ userTweets: tweets });
    },

    clearError: () => {
      set({ error: null });
    },

    clearTweets: () => {
      set({ tweets: [] });
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

    // ========================================================================
    // Modal Operations
    // ========================================================================

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
  })
);
