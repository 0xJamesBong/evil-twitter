export interface ProfileNode {
  id: string | null;
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  createdAt: string;
}

export type TweetType = "Original" | "Retweet" | "Quote" | "Reply";

export interface TweetMetrics {
  likes: number;
  retweets: number;
  quotes: number;
  replies: number;
  impressions: number;
  smacks: number;
}

export interface TweetEnergyState {
  energy: number;
  kineticEnergy: number;
  potentialEnergy: number;
  energyGainedFromSupport: number;
  energyLostFromAttacks: number;
  mass: number;
  velocityInitial: number;
  heightInitial: number;
}

export interface TweetNode {
  id: string | null;
  ownerId: string;
  content: string;
  tweetType: TweetType;
  metrics: TweetMetrics;
  energyState: TweetEnergyState;
  author: ProfileNode | null;
  quotedTweet: TweetNode | null;
  repliedToTweet: TweetNode | null;
  rootTweetId: string | null;
  quotedTweetId: string | null;
  repliedToTweetId: string | null;
  updatedAt: string | null;
  createdAt: string;
  replyDepth: number;
}
