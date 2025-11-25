import { MockTweet } from "@/components/tweets/TweetCard";

// Generate mock tweets
export function generateMockTweets(count: number = 20): MockTweet[] {
  const handles = [
    "alice_crypto",
    "bob_solana",
    "charlie_defi",
    "diana_nft",
    "eve_web3",
    "frank_builder",
    "grace_designer",
    "henry_dev",
  ];

  const displayNames = [
    "Alice Crypto",
    "Bob Solana",
    "Charlie DeFi",
    "Diana NFT",
    "Eve Web3",
    "Frank Builder",
    "Grace Designer",
    "Henry Dev",
  ];

  const tweetContents = [
    "Just shipped a new feature! 🚀 The team worked incredibly hard on this one.",
    "Excited to announce our latest partnership! This is going to be huge for the ecosystem.",
    "Thinking about the future of decentralized social media. What do you all think?",
    "Just discovered an amazing new project. The innovation in this space never stops!",
    "Had an incredible conversation with @someone today. The community here is so supportive.",
    "Building in public is hard, but it's also incredibly rewarding. Thanks for all the support!",
    "The energy in the crypto space right now is electric ⚡️ So many exciting developments!",
    "Just minted my first NFT collection. The artwork is absolutely stunning!",
    "Working late tonight on something special. Can't wait to share it with everyone soon.",
    "The best part about web3? The community. Hands down. You all are amazing!",
  ];

  const tweets: MockTweet[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const authorIndex = i % handles.length;
    const contentIndex = Math.floor(Math.random() * tweetContents.length);
    const hoursAgo = Math.floor(Math.random() * 48); // Random time in last 48 hours
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    // Occasionally create quote tweets
    let quotedTweet: MockTweet | undefined;
    if (i > 5 && Math.random() > 0.7) {
      const quotedIndex = Math.floor(Math.random() * i);
      if (quotedIndex < tweets.length) {
        quotedTweet = tweets[quotedIndex];
      }
    }

    const tweet: MockTweet = {
      id: `tweet_${i}`,
      content: tweetContents[contentIndex],
      author: {
        handle: handles[authorIndex],
        displayName: displayNames[authorIndex],
        avatarUrl: undefined, // Can add avatar URLs later
      },
      createdAt,
      metrics: {
        likes: Math.floor(Math.random() * 1000),
        retweets: Math.floor(Math.random() * 500),
        quotes: Math.floor(Math.random() * 100),
        replies: Math.floor(Math.random() * 200),
      },
      tweetType: quotedTweet ? "Quote" : "Original",
      quotedTweet,
    };

    tweets.push(tweet);
  }

  return tweets;
}
