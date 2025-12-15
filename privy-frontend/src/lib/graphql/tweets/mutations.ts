import { TweetNode, PostStateNode } from "./types";

export const TWEET_CREATE_MUTATION = `
  mutation TweetCreate($input: TweetCreateInput!) {
    tweetCreate(input: $input) {
      tweet {
        id
        ownerId
        content
        language
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
        repliedToTweet {
          id
          content
          author {
            handle
            displayName
          }
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
        language
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
        language
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
      onchainSignature
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
    onchainSignature?: string | null;
  };
}

export const TWEET_RETWEET_MUTATION = `
  mutation TweetRetweet($id: ID!) {
    tweetRetweet(id: $id) {
      tweet {
        id
        ownerId
        content
        language
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

export const CLAIM_POST_REWARD_MUTATION = `
  mutation ClaimPostReward($input: ClaimRewardInput!) {
    claimPostReward(input: $input) {
      signature
      amount
    }
  }
`;

export interface ClaimRewardInput {
  tweetId: string;
  tokenMint: string;
}

export interface ClaimRewardResult {
  claimPostReward: {
    signature: string;
    amount: string;
  };
}

export const SETTLE_POST_MUTATION = `
  mutation SettlePost($input: SettlePostInput!) {
    settlePost(input: $input) {
      signature
      postState {
        state
        upvotes
        downvotes
        winningSide
        endTime
        function
        potBalances {
          bling
          usdc
          stablecoin
        }
        payoutInfo {
          frozen
          creatorFee
          protocolFee
          motherFee
          totalPayout
        }
      }
    }
  }
`;

export interface SettlePostInput {
  tweetId: string;
  // tokenMint removed - backend now loops through all tokens automatically
}

export interface SettlePostResult {
  settlePost: {
    signature: string;
    postState?: PostStateNode | null;
  };
}

export const TWEET_QUESTION_MUTATION = `
  mutation TweetQuestion($input: TweetQuestionInput!) {
    tweetQuestion(input: $input) {
      tweet {
        id
        ownerId
        content
        language
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

export interface TweetQuestionInput {
  content: string;
}

export interface TweetQuestionResult {
  tweetQuestion: {
    tweet: TweetNode;
    onchainSignature?: string | null;
  };
}

export const TWEET_ANSWER_MUTATION = `
  mutation TweetAnswer($input: TweetAnswerInput!) {
    tweetAnswer(input: $input) {
      tweet {
        id
        ownerId
        content
        language
        tweetType
        createdAt
        updatedAt
        replyDepth
        postIdHash
        postState {
          state
          function
          startTime
          endTime
          winningSide
          upvotes
          downvotes
          payoutInfo {
            tokenMint
            totalPayout
          }
        }
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

export interface TweetAnswerInput {
  content: string;
  questionTweetId: string;
}

export interface TweetAnswerResult {
  tweetAnswer: {
    tweet: TweetNode;
    onchainSignature?: string | null;
  };
}
