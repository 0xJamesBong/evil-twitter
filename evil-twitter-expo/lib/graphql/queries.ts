export const PROFILE_QUERY = `
  query Profile($userId: ID!, $viewerId: ID) {
    user(id: $userId) {
      id
      supabaseId
      username
      displayName
      email
      bio
      avatarUrl
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
      tweets(first: 20) {
        totalCount
        edges {
          node {
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
              tweetType
              replyDepth
              createdAt
              metrics {
                likes
                smacks
                retweets
                quotes
                replies
                impressions
              }
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
              tweetType
              replyDepth
              createdAt
              metrics {
                likes
                smacks
                retweets
                quotes
                replies
                impressions
              }
              author {
                username
                displayName
                avatarUrl
              }
            }
          }
        }
      }
      isFollowedBy(viewerId: $viewerId)
    }
  }
`;

export interface ProfileQueryResult {
  user: GraphQLProfileUser | null;
}

export interface GraphQLProfileUser {
  id: string;
  supabaseId?: string | null;
  username: string;
  displayName: string;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  dollarConversionRate: number;
  createdAt?: string | null;
  balances?: GraphQLBalanceSummary | null;
  tweets: {
    totalCount: number;
    edges: { node: GraphQLTweetNode }[];
  };
  isFollowedBy: boolean;
}

export interface GraphQLBalanceSummary {
  dooler: number;
  usdc: number;
  bling: number;
  sol: number;
}

export interface GraphQLTweetNode {
  id: string;
  ownerId: string;
  content: string;
  tweetType: string;
  replyDepth: number;
  rootTweetId?: string | null;
  quotedTweetId?: string | null;
  repliedToTweetId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  metrics: GraphQLTweetMetrics;
  energyState: GraphQLEnergyState;
  author?: GraphQLAuthorSnapshot | null;
  quotedTweet?: GraphQLNestedTweet | null;
  repliedToTweet?: GraphQLNestedTweet | null;
}

export interface GraphQLNestedTweet {
  id: string;
  ownerId: string;
  content: string;
  tweetType: string;
  replyDepth: number;
  createdAt: string;
  metrics: GraphQLTweetMetrics;
  author?: GraphQLAuthorSnapshot | null;
}

export interface GraphQLAuthorSnapshot {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface GraphQLTweetMetrics {
  likes: number;
  smacks: number;
  retweets: number;
  quotes: number;
  replies: number;
  impressions: number;
}

export interface GraphQLEnergyState {
  energy: number;
  kineticEnergy: number;
  potentialEnergy: number;
  energyGainedFromSupport: number;
  energyLostFromAttacks: number;
  mass: number;
  velocityInitial: number;
  heightInitial: number;
}

// Add after PROFILE_QUERY

export const TWEET_THREAD_QUERY = `
  query TweetThread($tweetId: ID!) {
    tweetThread(tweetId: $tweetId) {
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
          tweetType
          replyDepth
          createdAt
          metrics {
            likes
            smacks
            retweets
            quotes
            replies
            impressions
          }
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
          tweetType
          replyDepth
          createdAt
          metrics {
            likes
            smacks
            retweets
            quotes
            replies
            impressions
          }
          author {
            username
            displayName
            avatarUrl
          }
        }
      }
      parents {
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
      }
      replies {
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
      }
    }
  }
`;

// Add TypeScript interfaces
export interface TweetThreadQueryResult {
  tweetThread: GraphQLTweetThread;
}

export interface GraphQLTweetThread {
  tweet: GraphQLTweetNode;
  parents: GraphQLTweetNode[];
  replies: GraphQLTweetNode[];
}

export const TIMELINE_QUERY = `
  query Timeline($first: Int, $after: String = "") {
    timeline(first: $first, after: $after) {
      totalCount
      edges {
        cursor
        node {
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
            tweetType
            replyDepth
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
          repliedToTweet {
            id
            ownerId
            content
            tweetType
            replyDepth
            createdAt
            author {
              username
              displayName
            }
          }
        }
      }
    }
  }
`;

export interface TimelineQueryResult {
  timeline: {
    totalCount: number;
    edges: {
      cursor: string;
      node: GraphQLTweetNode;
    }[];
  };
}
