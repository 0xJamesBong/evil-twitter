export interface UserNode {
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
}

