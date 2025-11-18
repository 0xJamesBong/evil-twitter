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
    }
  }
`;

export interface TweetCreateInput {
  content: string;
}

export interface TweetCreateResult {
  tweetCreate: {
    tweet: TweetNode;
  };
}

export const TWEET_REPLY_MUTATION = `
  mutation TweetReply($input: TweetReplyInput!) {
    tweet_reply(input: $input) {
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
  replied_to_id: string;
}

export interface TweetReplyResult {
  tweet_reply: {
    tweet: TweetNode;
  };
}

export const TWEET_QUOTE_MUTATION = `
  mutation TweetQuote($input: TweetQuoteInput!) {
    tweet_quote(input: $input) {
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
  quoted_tweet_id: string;
}

export interface TweetQuoteResult {
  tweet_quote: {
    tweet: TweetNode;
  };
}

export const TWEET_RETWEET_MUTATION = `
  mutation TweetRetweet($id: ID!) {
    tweet_retweet(id: $id) {
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
  tweet_retweet: {
    tweet: TweetNode;
  };
}

export const TWEET_LIKE_MUTATION = `
  mutation TweetLike($id: ID!, $idempotency_key: String) {
    tweet_like(id: $id, idempotency_key: $idempotency_key) {
      id
      likeCount
      smackCount
      likedByViewer
      energy
    }
  }
`;

export interface TweetLikeResult {
  tweet_like: {
    id: string;
    like_count: number;
    smack_count: number;
    liked_by_viewer: boolean;
    energy: number;
  };
}
