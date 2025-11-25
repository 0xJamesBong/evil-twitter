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
  };
}
