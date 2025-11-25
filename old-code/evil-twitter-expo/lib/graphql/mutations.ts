import { GraphQLProfileUser } from "./queries";

// Mutations
export const CREATE_TWEET_MUTATION = `
  mutation CreateTweet($input: TweetCreateInput!) {
    tweetCreate(input: $input) {
      tweet {
        id
        ownerId
        content
        tweetType
        replyDepth
        rootTweetId
        quotedTweetId
        repliedToTweetId
        createdAt
        updatedAt
        metrics {
          likes
          smacks
          retweets
          quotes
          replies
          impressions
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
          username
          displayName
          avatarUrl
        }
        quotedTweet {
          id
          ownerId
          content
          createdAt
          author {
            username
            displayName
            avatarUrl
          }
        }
        repliedToTweet {
          id
          ownerId
          content
          createdAt
          author {
            username
            displayName
            avatarUrl
          }
        }
      }
    }
  }
`;
// export const ATTACK_TWEET_MUTATION = ``;

// export const SUPPORT_TWEET_MUTATION = ``;

export const LIKE_TWEET_MUTATION = `
  mutation LikeTweet($id: ID!, $idempotencyKey: String) {
    tweetLike(id: $id, idempotencyKey: $idempotencyKey) {
      id
      likeCount
      smackCount
      likedByViewer
      energy
    }
  }
`;

export const SMACK_TWEET_MUTATION = `
  mutation SmackTweet($id: ID!, $idempotencyKey: String) {
    tweetSmack(id: $id, idempotencyKey: $idempotencyKey) {
      id
      energy
      tokensCharged
      tokensPaidToAuthor
    }
  }
`;

// Update REPLY_TWEET_MUTATION to return full tweet:
export const REPLY_TWEET_MUTATION = `
  mutation ReplyTweet($input: TweetReplyInput!) {
    tweetReply(input: $input) {
      tweet {
        id
        ownerId
        content
        tweetType
        replyDepth
        rootTweetId
        repliedToTweetId
        createdAt
        updatedAt
        metrics {
          likes
          smacks
          retweets
          quotes
          replies
        }
        energyState {
          energy
        }
        author {
          username
          displayName
          avatarUrl
        }
      }
    }
  }
`;

// Update QUOTE_TWEET_MUTATION to return full tweet:
export const QUOTE_TWEET_MUTATION = `
  mutation QuoteTweet($input: TweetQuoteInput!) {
    tweetQuote(input: $input) {
      tweet {
        id
        ownerId
        content
        tweetType
        quotedTweetId
        createdAt
        updatedAt
        metrics {
          likes
          smacks
          retweets
          quotes
          replies
        }
        energyState {
          energy
        }
        author {
          username
          displayName
          avatarUrl
        }
        quotedTweet {
          id
          ownerId
          content
          createdAt
          author {
            username
            displayName
            avatarUrl
          }
        }
      }
    }
  }
`;
// Update RETWEET_MUTATION to return full tweet:
export const RETWEET_MUTATION = `
  mutation Retweet($id: ID!) {
    tweetRetweet(id: $id) {
      tweet {
        id
        ownerId
        content
        tweetType
        quotedTweetId
        createdAt
        metrics {
          likes
          smacks
          retweets
        }
        author {
          username
          displayName
          avatarUrl
        }
      }
    }
  }
`;

// Add after existing mutations:

export const CREATE_USER_MUTATION = `
  mutation CreateUser($input: UserCreateInput!) {
    userCreate(input: $input) {
      user {
        id
        supabaseId
        username
        displayName
        email
        avatarUrl
        bio
        followersCount
        followingCount
        tweetsCount
        dollarConversionRate
        createdAt
        balances {
          dooler
          usdc
          bling
          sol
        }
      }
    }
  }
`;

export interface CreateUserMutationResult {
  userCreate: {
    user: GraphQLProfileUser;
  };
}
