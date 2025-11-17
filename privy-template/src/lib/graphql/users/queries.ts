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
