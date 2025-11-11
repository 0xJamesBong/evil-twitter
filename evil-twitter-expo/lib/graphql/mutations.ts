// Mutations
export const CREATE_TWEET_MUTATION = `
  mutation CreateTweet($input: TweetCreateInput!) {
    tweetCreate(input: $input) {
      tweet {
        id
        ownerId
        content
        createdAt
        metrics {
          likes
          smacks
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

export const REPLY_TWEET_MUTATION = `
  mutation ReplyTweet($input: TweetReplyInput!) {
    tweetReply(input: $input) {
      tweet {
        id
        content
        createdAt
        author {
          username
          displayName
        }
      }
    }
  }
`;

export const QUOTE_TWEET_MUTATION = `
  mutation QuoteTweet($input: TweetQuoteInput!) {
    tweetQuote(input: $input) {
      tweet {
        id
        content
        createdAt
        author {
          username
          displayName
        }
      }
    }
  }
`;

export const RETWEET_MUTATION = `
  mutation Retweet($id: ID!) {
    tweetRetweet(id: $id) {
      tweet {
        id
        content
        createdAt
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
