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
      hasOnchainAccount
      vaultBalance
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
    hasOnchainAccount: boolean | null;
    vaultBalance: number | null;
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
