export const ONBOARD_USER_MUTATION = `
  mutation OnboardUser($input: OnboardUserInput!) {
    onboardUser(input: $input) {
      user {
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
      session {
        sessionAuthorityPda
        sessionKey
        expiresAt
        userWallet
      }
    }
  }
`;

export interface OnboardUserResult {
  onboardUser: {
    user: {
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
    };
    session: {
      sessionAuthorityPda: string;
      sessionKey: string;
      expiresAt: number;
      userWallet: string;
    } | null;
  };
}

export const RENEW_SESSION_MUTATION = `
  mutation RenewSession($input: RenewSessionInput!) {
    renewSession(input: $input) {
      session {
        sessionAuthorityPda
        sessionKey
        expiresAt
        userWallet
      }
    }
  }
`;

export interface RenewSessionResult {
  renewSession: {
    session: {
      sessionAuthorityPda: string;
      sessionKey: string;
      expiresAt: number;
      userWallet: string;
    };
  };
}

export const SESSION_MESSAGE_QUERY = `
  query SessionMessage {
    sessionMessage
  }
`;

export const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
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

export interface UpdateProfileResult {
  updateProfile: {
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
  };
}

export const UPDATE_DEFAULT_PAYMENT_TOKEN_MUTATION = `
  mutation UpdateDefaultPaymentToken($input: UpdateDefaultPaymentTokenInput!) {
    updateDefaultPaymentToken(input: $input) {
      id
      privyId
      wallet
      defaultPaymentToken
    }
  }
`;

export interface UpdateDefaultPaymentTokenResult {
  updateDefaultPaymentToken: {
    id: string;
    privyId: string;
    wallet: string;
    defaultPaymentToken: string | null;
  };
}

export const FOLLOW_USER_MUTATION = `
  mutation FollowUser($input: FollowUserInput!) {
    followUser(input: $input) {
      success
      isFollowing
    }
  }
`;

export interface FollowUserResult {
  followUser: {
    success: boolean;
    isFollowing: boolean;
  };
}

export const UNFOLLOW_USER_MUTATION = `
  mutation UnfollowUser($input: UnfollowUserInput!) {
    unfollowUser(input: $input) {
      success
      isFollowing
    }
  }
`;

export interface UnfollowUserResult {
  unfollowUser: {
    success: boolean;
    isFollowing: boolean;
  };
}
