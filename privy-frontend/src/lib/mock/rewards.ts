import { ClaimableRewardNode } from "@/lib/graphql/tweets/queries";

/**
 * Dummy rewards data for testing/development
 * These match the structure of ClaimableRewardNode from the GraphQL API
 *
 * Scenarios included:
 * - Voter rewards: You voted on posts and won
 * - Creator rewards: You created posts that were settled
 * - Answerer rewards: You answered questions (voter type, but for answers)
 */
export const dummyRewards: ClaimableRewardNode[] = [
  // ============================================================================
  // VOTER REWARDS - You voted on posts and your side won
  // ============================================================================
  {
    tweetId: "507f1f77bcf86cd799439011",
    postIdHash:
      "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "1000000000", // 1 BLING (9 decimals)
    rewardType: "voter", // You voted Pump and won
  },
  {
    tweetId: "507f1f77bcf86cd799439011",
    postIdHash:
      "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    tokenMint:
      process.env.NEXT_PUBLIC_USDC_MINT ||
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "5000000", // 5 USDC (6 decimals)
    rewardType: "voter", // You voted Pump and won
  },
  {
    tweetId: "507f1f77bcf86cd799439012",
    postIdHash:
      "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "2500000000", // 2.5 BLING (9 decimals)
    rewardType: "voter", // You voted Smack and won
  },
  {
    tweetId: "507f1f77bcf86cd799439013",
    postIdHash:
      "c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "500000000", // 0.5 BLING (9 decimals)
    rewardType: "voter", // You voted Pump and won
  },
  {
    tweetId: "507f1f77bcf86cd799439013",
    postIdHash:
      "c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890",
    tokenMint:
      process.env.NEXT_PUBLIC_USDC_MINT ||
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "10000000", // 10 USDC (6 decimals)
    rewardType: "voter", // You voted Pump and won
  },

  // ============================================================================
  // CREATOR REWARDS - You created posts that were settled
  // ============================================================================
  {
    tweetId: "507f1f77bcf86cd799439020",
    postIdHash:
      "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "5000000000", // 5 BLING (9 decimals) - Creator fee
    rewardType: "creator", // You created this post
  },
  {
    tweetId: "507f1f77bcf86cd799439020",
    postIdHash:
      "f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    tokenMint:
      process.env.NEXT_PUBLIC_USDC_MINT ||
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "20000000", // 20 USDC (6 decimals) - Creator fee
    rewardType: "creator", // You created this post
  },
  {
    tweetId: "507f1f77bcf86cd799439021",
    postIdHash:
      "a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "3000000000", // 3 BLING (9 decimals) - Creator fee
    rewardType: "creator", // You created this question post
  },

  // ============================================================================
  // ANSWERER REWARDS - You answered a question and your answer won
  // ============================================================================
  {
    tweetId: "507f1f77bcf86cd799439022",
    postIdHash:
      "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "4000000000", // 4 BLING (9 decimals)
    rewardType: "voter", // You answered a question and your answer was approved/won
  },
  {
    tweetId: "507f1f77bcf86cd799439022",
    postIdHash:
      "b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
    tokenMint:
      process.env.NEXT_PUBLIC_USDC_MINT ||
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "15000000", // 15 USDC (6 decimals)
    rewardType: "voter", // You answered a question and your answer was approved/won
  },
  {
    tweetId: "507f1f77bcf86cd799439023",
    postIdHash:
      "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "2000000000", // 2 BLING (9 decimals)
    rewardType: "voter", // You answered another question and won
  },

  // ============================================================================
  // MORE VOTER REWARDS - Additional voting scenarios
  // ============================================================================
  {
    tweetId: "507f1f77bcf86cd799439014",
    postIdHash:
      "d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890ab",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "7500000000", // 7.5 BLING (9 decimals)
    rewardType: "voter", // You voted and won big
  },
  {
    tweetId: "507f1f77bcf86cd799439015",
    postIdHash:
      "e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd",
    tokenMint:
      process.env.NEXT_PUBLIC_BLING_MINT ||
      "So11111111111111111111111111111111111111112",
    amount: "1500000000", // 1.5 BLING (9 decimals)
    rewardType: "voter", // You voted and won
  },
  {
    tweetId: "507f1f77bcf86cd799439015",
    postIdHash:
      "e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcd",
    tokenMint:
      process.env.NEXT_PUBLIC_USDC_MINT ||
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "2500000", // 2.5 USDC (6 decimals)
    rewardType: "voter", // You voted and won
  },
];
