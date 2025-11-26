export const USER_VAULT_BALANCE_QUERY = `
  query UserVaultBalance($tokenMint: String) {
    me {
      vaultBalance(tokenMint: $tokenMint)
    }
  }
`;

export interface UserVaultBalanceResult {
  me: {
    vaultBalance: number;
  } | null;
}

