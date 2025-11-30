import { TweetNode } from "./types";

export const TWEET_CREATE_MUTATION = `
  mutation TweetCreate($input: TweetCreateInput!) {
    tweetCreate(input: $input) {
      tweet {
        id
        ownerId
        content
        tweetType
        createdAt
        updatedAt
        replyDepth
        metrics {
          likes
          retweets
          quotes
          replies
          impressions
          smacks
        }
        energyState {
          energy
          kineticEnergy
          potentialEnergy
          energyGainedFromSupport
          energyLostFromAttacks
          mass
          velocityInitial
          heightInitial
        }
        author {
          id
          userId
          handle
          displayName
          avatarUrl
          bio
          status
          createdAt
        }
        rootTweetId
        quotedTweetId
        repliedToTweetId
      }
      onchainSignature
    }
  }
`;

export interface TweetCreateInput {
  content: string;
}

export interface TweetCreateResult {
  tweetCreate: {
    tweet: TweetNode;
    onchainSignature?: string | null;
  };
}

export const TWEET_REPLY_MUTATION = `
  mutation TweetReply($input: TweetReplyInput!) {
    tweetReply(input: $input) {
      tweet {
        id
        ownerId
        content
        tweetType
        createdAt
        updatedAt
        replyDepth
        metrics {
          likes
          retweets
          quotes
          replies
          impressions
          smacks
        }
        energyState {
          energy
          kineticEnergy
          potentialEnergy
          energyGainedFromSupport
          energyLostFromAttacks
          mass
          velocityInitial
          heightInitial
        }
        author {
          id
          userId
          handle
          displayName
          avatarUrl
          bio
          status
          createdAt
        }
        rootTweetId
        quotedTweetId
        repliedToTweetId
      }
    }
  }
`;

export interface TweetReplyInput {
  content: string;
  repliedToId: string;
}

export interface TweetReplyResult {
  tweetReply: {
    tweet: TweetNode;
  };
}

export const TWEET_QUOTE_MUTATION = `
  mutation TweetQuote($input: TweetQuoteInput!) {
    tweetQuote(input: $input) {
      tweet {
        id
        ownerId
        content
        tweetType
        createdAt
        updatedAt
        replyDepth
        metrics {
          likes
          retweets
          quotes
          replies
          impressions
          smacks
        }
        energyState {
          energy
          kineticEnergy
          potentialEnergy
          energyGainedFromSupport
          energyLostFromAttacks
          mass
          velocityInitial
          heightInitial
        }
        author {
          id
          userId
          handle
          displayName
          avatarUrl
          bio
          status
          createdAt
        }
        quotedTweet {
          id
          ownerId
          content
          tweetType
          createdAt
          metrics {
            likes
            retweets
            quotes
            replies
          }
          author {
            handle
            displayName
            avatarUrl
          }
        }
        rootTweetId
        quotedTweetId
        repliedToTweetId
      }
    }
  }
`;

export interface TweetQuoteInput {
  content: string;
  quotedTweetId: string;
}

export interface TweetQuoteResult {
  tweetQuote: {
    tweet: TweetNode;
  };
}

export const TWEET_RETWEET_MUTATION = `
  mutation TweetRetweet($id: ID!) {
    tweetRetweet(id: $id) {
      tweet {
        id
        ownerId
        content
        tweetType
        createdAt
        updatedAt
        replyDepth
        metrics {
          likes
          retweets
          quotes
          replies
          impressions
          smacks
        }
        energyState {
          energy
          kineticEnergy
          potentialEnergy
          energyGainedFromSupport
          energyLostFromAttacks
          mass
          velocityInitial
          heightInitial
        }
        author {
          id
          userId
          handle
          displayName
          avatarUrl
          bio
          status
          createdAt
        }
        rootTweetId
        quotedTweetId
        repliedToTweetId
      }
    }
  }
`;

export interface TweetRetweetResult {
  tweetRetweet: {
    tweet: TweetNode;
  };
}

export const TWEET_LIKE_MUTATION = `
  mutation TweetLike($id: ID!, $idempotencyKey: String) {
    tweetLike(id: $id, idempotencyKey: $idempotencyKey) {
      id
      likeCount
      smackCount
      likedByViewer
      energy
    }
  }
`;

export interface TweetLikeResult {
  tweetLike: {
    id: string;
    likeCount: number;
    smackCount: number;
    likedByViewer: boolean;
    energy: number;
  };
}

export const TWEET_VOTE_MUTATION = `
  mutation TweetVote($input: TweetVoteInput!) {
    tweetVote(input: $input) {
      id
      likeCount
      smackCount
      likedByViewer
      energy
    }
  }
`;

export interface TweetVoteInput {
  tweetId: string;
  side: string; // "pump" or "smack"
  votes: number;
  tokenMint?: string; // Optional, defaults to BLING
}

export interface TweetVoteResult {
  tweetVote: {
    id: string;
    likeCount: number;
    smackCount: number;
    likedByViewer: boolean;
    energy: number;
  };
}

