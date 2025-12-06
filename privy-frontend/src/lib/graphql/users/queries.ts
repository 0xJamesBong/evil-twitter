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
