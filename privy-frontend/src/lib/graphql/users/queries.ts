export const ME_QUERY = `
  query Me {
    me {
      id
      privyId
      wallet
      loginType
      email
      status
      createdAt
      defaultPaymentToken
      hasOnchainAccount
      vaultBalance
      vaultBalances {
        bling
        usdc
        stablecoin
      }
      socialScore
      followersCount
      followingCount
      isFollowedByViewer
      profile {
        id
        userId
        handle
        displayName
        avatarUrl
        bio
        status
        createdAt
      }
    }
  }
`;

export interface MeQueryResult {
  me: {
    id: string;
    privyId: string;
    wallet: string;
    loginType: string;
    email: string | null;
    status: string;
    createdAt: string;
    defaultPaymentToken: string | null;
    hasOnchainAccount: boolean | null;
    vaultBalance: number | null;
    vaultBalances: {
      bling: number;
      usdc: number | null;
      stablecoin: number | null;
    };
    socialScore: number | null;
    followersCount: number;
    followingCount: number;
    isFollowedByViewer: boolean;
    profile: {
      id: string;
      userId: string;
      handle: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      status: string;
      createdAt: string;
    } | null;
  } | null;
}

export const CANONICAL_VOTE_COST_QUERY = `
  query CanonicalVoteCost($side: String!) {
    canonicalVoteCost(side: $side)
  }
`;

export interface CanonicalVoteCostResult {
  canonicalVoteCost: number;
}

export const CANONICAL_VOTE_COSTS_QUERY = `
  query CanonicalVoteCosts($side: String!) {
    canonicalVoteCosts(side: $side) {
      bling
      usdc
      stablecoin
    }
  }
`;

export interface CanonicalVoteCostsResult {
  canonicalVoteCosts: {
    bling: number;
    usdc: number | null;
    stablecoin: number | null;
  };
}

export const CURRENT_SESSION_QUERY = `
  query CurrentSession {
    currentSession {
      sessionAuthorityPda
      sessionKey
      expiresAt
      userWallet
    }
  }
`;

export interface CurrentSessionResult {
  currentSession: {
    sessionAuthorityPda: string;
    sessionKey: string;
    expiresAt: number;
    userWallet: string;
  } | null;
}

export const USER_BY_HANDLE_QUERY = `
  query UserByHandle($handle: String!, $first: Int) {
    userByHandle(handle: $handle) {
      id
      privyId
      wallet
      loginType
      email
      status
      createdAt
      defaultPaymentToken
      hasOnchainAccount
      vaultBalance
      vaultBalances {
        bling
        usdc
        stablecoin
      }
      socialScore
      followersCount
      followingCount
      isFollowedByViewer
      profile {
        id
        userId
        handle
        displayName
        avatarUrl
        bio
        status
        createdAt
      }
      tweets(first: $first) {
        edges {
          cursor
          node {
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
            repliedToTweet {
              id
              ownerId
              content
              tweetType
              createdAt
              author {
                handle
                displayName
              }
            }
            rootTweetId
            quotedTweetId
            repliedToTweetId
            postIdHash
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
              userVotes {
                upvotes
                downvotes
              }
            }
          }
        }
      }
    }
  }
`;

export interface UserByHandleResult {
  userByHandle: {
    id: string;
    privyId: string;
    wallet: string;
    loginType: string;
    email: string | null;
    status: string;
    createdAt: string;
    defaultPaymentToken: string | null;
    hasOnchainAccount: boolean | null;
    vaultBalance: number | null;
    vaultBalances: {
      bling: number;
      usdc: number | null;
      stablecoin: number | null;
    };
    socialScore: number | null;
    followersCount: number;
    followingCount: number;
    isFollowedByViewer: boolean;
    profile: {
      id: string;
      userId: string;
      handle: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      status: string;
      createdAt: string;
    } | null;
    tweets?: {
      edges: Array<{
        cursor: string;
        node: any;
      }>;
    };
  } | null;
}

export const USER_BY_ID_QUERY = `
  query UserById($id: ID!, $first: Int) {
    user(id: $id) {
      id
      privyId
      wallet
      loginType
      email
      status
      createdAt
      defaultPaymentToken
      hasOnchainAccount
      vaultBalance
      vaultBalances {
        bling
        usdc
        stablecoin
      }
      socialScore
      followersCount
      followingCount
      isFollowedByViewer
      profile {
        id
        userId
        handle
        displayName
        avatarUrl
        bio
        status
        createdAt
      }
      tweets(first: $first) {
        edges {
          cursor
          node {
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
            repliedToTweet {
              id
              ownerId
              content
              tweetType
              createdAt
              author {
                handle
                displayName
              }
            }
            rootTweetId
            quotedTweetId
            repliedToTweetId
            postIdHash
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
              userVotes {
                upvotes
                downvotes
              }
            }
          }
        }
      }
    }
  }
`;

export interface UserByIdResult {
  user: {
    id: string;
    privyId: string;
    wallet: string;
    loginType: string;
    email: string | null;
    status: string;
    createdAt: string;
    defaultPaymentToken: string | null;
    hasOnchainAccount: boolean | null;
    vaultBalance: number | null;
    vaultBalances: {
      bling: number;
      usdc: number | null;
      stablecoin: number | null;
    };
    socialScore: number | null;
    followersCount: number;
    followingCount: number;
    isFollowedByViewer: boolean;
    profile: {
      id: string;
      userId: string;
      handle: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      status: string;
      createdAt: string;
    } | null;
    tweets?: {
      edges: Array<{
        cursor: string;
        node: any;
      }>;
    };
  } | null;
}
