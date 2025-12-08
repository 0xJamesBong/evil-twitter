import { TweetNode } from "./types";

export const TIMELINE_QUERY = `
  query Timeline($first: Int, $after: String) {
    timeline(first: $first, after: $after) {
      totalCount
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
`;

export interface TimelineQueryResult {
  timeline: {
    totalCount: number;
    edges: Array<{
      cursor: string;
      node: TweetNode;
    }>;
  };
}

export const TWEET_QUERY = `
  query Tweet($id: ID!) {
    tweet(id: $id) {
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
`;

export interface TweetQueryResult {
  tweet: TweetNode | null;
}

export const TWEET_THREAD_QUERY = `
  query TweetThread($tweetId: ID!) {
    tweetThread(tweetId: $tweetId) {
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
      parents {
        id
        ownerId
        content
        tweetType
        createdAt
        replyDepth
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
      replies {
        id
        ownerId
        content
        tweetType
        createdAt
        replyDepth
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
`;

export interface TweetThreadQueryResult {
  tweetThread: {
    tweet: TweetNode;
    parents: TweetNode[];
    replies: TweetNode[];
  };
}

export const CLAIMABLE_REWARDS_QUERY = `
  query ClaimableRewards {
    claimableRewards {
      tweetId
      postIdHash
      tokenMint
      amount
      rewardType
    }
  }
`;

export interface ClaimableRewardNode {
  tweetId: string;
  postIdHash: string;
  tokenMint: string;
  amount: string;
  rewardType: string;
}

export interface ClaimableRewardsQueryResult {
  claimableRewards: ClaimableRewardNode[];
}
