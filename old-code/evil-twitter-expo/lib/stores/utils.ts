import { GraphQLNestedTweet, GraphQLTweetNode } from "../graphql/queries";

export type ObjectIdRef = { $oid: string };

export const toObjectIdRef = (
  value?: string | null
): ObjectIdRef | undefined => {
  if (!value) {
    return undefined;
  }
  return { $oid: value };
};

export const toMongoDate = (iso?: string | null) => {
  const timestamp = iso ? Date.parse(iso) : Date.now();
  const safeTimestamp = Number.isNaN(timestamp) ? Date.now() : timestamp;
  return {
    $date: { $numberLong: String(safeTimestamp) },
  };
};

export const mapGraphUserToBackend = (
  node: GraphQLProfileUser
): BackendUser => ({
  _id: { $oid: node.id },
  supabase_id: node.supabaseId ?? "",
  username: node.username,
  display_name: node.displayName,
  email: node.email ?? "",
  avatar_url: node.avatarUrl ?? undefined,
  bio: node.bio ?? undefined,
  created_at: toMongoDate(node.createdAt),
  followers_count: node.followersCount,
  following_count: node.followingCount,
  tweets_count: node.tweetsCount,
  dollar_conversion_rate: node.dollarConversionRate,
  weapon_ids: [],
});

export const mapGraphBalances = (
  balances?: GraphQLBalanceSummary | null
): { [key: string]: number } => ({
  Bling: balances?.bling ?? 0,
  Dooler: balances?.dooler ?? 0,
  Usdc: balances?.usdc ?? 0,
  Sol: balances?.sol ?? 0,
});

export const isFullTweetNode = (
  node: GraphQLTweetNode | GraphQLNestedTweet
): node is GraphQLTweetNode => {
  return (node as GraphQLTweetNode).energyState !== undefined;
};

export const mapGraphTweetNode = (
  node: GraphQLTweetNode | GraphQLNestedTweet
): any => {
  const isFull = isFullTweetNode(node);
  const metrics = node.metrics ?? {
    likes: 0,
    smacks: 0,
    retweets: 0,
    quotes: 0,
    replies: 0,
    impressions: 0,
  };
  const energy = isFull ? node.energyState : undefined;

  return {
    _id: toObjectIdRef(node.id),
    owner_id: toObjectIdRef(node.ownerId),
    content: node.content,
    tweet_type: (node.tweetType ?? "original").toLowerCase(),
    reply_depth: node.replyDepth ?? 0,
    root_tweet_id: isFull ? toObjectIdRef(node.rootTweetId ?? null) : undefined,
    quoted_tweet_id: isFull
      ? toObjectIdRef(node.quotedTweetId ?? null)
      : undefined,
    replied_to_tweet_id: isFull
      ? toObjectIdRef(node.repliedToTweetId ?? null)
      : undefined,
    created_at: node.createdAt,
    updated_at: isFull ? node.updatedAt ?? undefined : undefined,
    metrics: {
      likes: metrics.likes ?? 0,
      smacks: metrics.smacks ?? 0,
      retweets: metrics.retweets ?? 0,
      quotes: metrics.quotes ?? 0,
      replies: metrics.replies ?? 0,
      impressions: metrics.impressions ?? 0,
    },
    author_snapshot: {
      username: node.author?.username ?? undefined,
      display_name: node.author?.displayName ?? undefined,
      avatar_url: node.author?.avatarUrl ?? undefined,
    },
    viewer_context: {
      is_liked: false,
      is_retweeted: false,
      is_quoted: false,
    },
    energy_state: {
      energy: energy?.energy ?? 0,
      kinetic_energy: energy?.kineticEnergy ?? 0,
      potential_energy: energy?.potentialEnergy ?? 0,
      energy_gained_from_support: energy?.energyGainedFromSupport ?? 0,
      energy_lost_from_attacks: energy?.energyLostFromAttacks ?? 0,
      mass: energy?.mass ?? 0,
      velocity_initial: energy?.velocityInitial ?? 0,
      height_initial: energy?.heightInitial ?? 0,
      last_update_timestamp: new Date().toISOString(),
      history: {
        support_history: [],
        attack_history: [],
      },
    },
    virality: {
      score: 0,
      momentum: 0,
      health_multiplier: 1,
    },
    quoted_tweet:
      isFull && node.quotedTweet
        ? mapGraphTweetNode(node.quotedTweet)
        : undefined,
    replied_to_tweet:
      isFull && node.repliedToTweet
        ? mapGraphTweetNode(node.repliedToTweet)
        : undefined,
  };
};
