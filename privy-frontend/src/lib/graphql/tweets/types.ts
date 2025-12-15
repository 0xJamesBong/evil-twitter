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

export interface PostPotBalances {
  bling: number;
  usdc?: number | null;
  stablecoin?: number | null;
}

export interface UserVotes {
  upvotes: number;
  downvotes: number;
}

export interface PostMintPayoutNode {
  tokenMint: string;
  frozen: boolean;
  creatorFee: string;
  protocolFee: string;
  motherFee: string;
  totalPayout: string;
}

export interface PostStateNode {
  state: string;
  upvotes: number;
  downvotes: number;
  winningSide?: string;
  startTime: number;
  endTime: number;
  function?: string | null; // "Normal", "Question", or "Answer"
  potBalances?: PostPotBalances | null;
  userVotes?: UserVotes | null;
  payoutInfo?: PostMintPayoutNode | null;
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
  postIdHash?: string;
  postState?: PostStateNode;
  language: string; // Script rendering mode: "CANTONESE", "GOETSUAN", or "NONE"
}
