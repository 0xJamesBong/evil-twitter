export const CREATE_ONCHAIN_USER_MUTATION = `
  mutation CreateOnchainUser {
    createOnchainUser {
      signature
      user {
        id
        wallet
        hasOnchainAccount
      }
    }
  }
`;

export interface CreateOnchainUserMutationResult {
  createOnchainUser: {
    signature: string;
    user: {
      id: string;
      wallet: string;
      hasOnchainAccount: boolean | null;
    };
  };
}
