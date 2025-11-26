"use client";

import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { PublicKey } from "@solana/web3.js";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  AccountBalanceWallet as WalletIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  AccountCircle as AccountCircleIcon,
  Login as LoginIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useDeposit } from "../../hooks/useDeposit";
import { useWithdraw } from "../../hooks/useWithdraw";
import { useCreateUser } from "../../hooks/useCreateUser";
import { useBackendUserStore } from "../../lib/stores/backendUserStore";
import { useSolanaStore } from "../../lib/stores/solanaStore";

// Default BLING mint - should match backend
const BLING_MINT = new PublicKey("bbb9w3ZidNJJGm4TKbhkCXqB9XSnzsjTedmJ5F2THX8");

export function VaultNavbar() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { identityToken } = useIdentityToken();

  // Try to find Privy embedded wallet first, then fall back to any Solana wallet
  const solanaWallet =
    wallets.find((w: any) => w.chainType === "solana" && w.walletClientType === "privy") ||
    wallets.find((w: any) => w.chainType === "solana");

  const { deposit, loading: depositLoading, error: depositError } = useDeposit();
  const { withdraw, loading: withdrawLoading, error: withdrawError } = useWithdraw();
  const { createUser, loading: createUserLoading, error: createUserError } = useCreateUser();
  const { enqueueSnackbar } = useSnackbar();

  // Use Zustand stores for data
  const { user, isLoading: queryLoading, refreshMe } = useBackendUserStore();
  const {
    vaultBalances,
    hasOnchainAccount,
    fetchVaultBalance,
    fetchOnchainAccountStatus,
    loadingVaultBalance,
    loadingOnchainAccount,
  } = useSolanaStore();

  // Fetch user data on mount and set up polling (only if authenticated)
  useEffect(() => {
    if (!authenticated || !identityToken) return;

    // Initial fetch
    useBackendUserStore.getState().fetchMe(identityToken);

    // Poll every 10 seconds
    const interval = setInterval(() => {
      if (identityToken) {
        refreshMe(identityToken);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [authenticated, identityToken, refreshMe]);

  // Fetch on-chain account status and vault balance when wallet is available
  useEffect(() => {
    if (authenticated && solanaWallet?.address) {
      const userPubkey = new PublicKey(solanaWallet.address);
      fetchOnchainAccountStatus(userPubkey);
      fetchVaultBalance(userPubkey, BLING_MINT);
    }
  }, [authenticated, solanaWallet?.address, fetchOnchainAccountStatus, fetchVaultBalance]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"deposit" | "withdraw" | "create">("deposit");
  const [amount, setAmount] = useState<string>("");

  // Use GraphQL balance if available, otherwise use chain balance from solanaStore
  const graphqlVaultBalance = user?.vaultBalance ?? null;
  const chainVaultBalance = vaultBalances[BLING_MINT.toBase58()] ?? null;
  const displayBalance = graphqlVaultBalance !== null ? graphqlVaultBalance : chainVaultBalance;

  // Determine if user has on-chain account (prefer GraphQL, fallback to solanaStore)
  const hasOnchainAccountFromGraphQL = user?.hasOnchainAccount ?? null;
  const hasOnchainAccountFinal =
    hasOnchainAccountFromGraphQL !== null ? hasOnchainAccountFromGraphQL : hasOnchainAccount;

  const handleOpenCreateAccount = () => {
    if (!solanaWallet) {
      enqueueSnackbar("Please connect a Solana wallet", { variant: "error" });
      return;
    }
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleOpenDialog = (mode: "deposit" | "withdraw") => {
    if (!solanaWallet) {
      enqueueSnackbar("Please connect a Solana wallet", { variant: "error" });
      return;
    }

    // If no on-chain account, redirect to create account dialog
    if (!hasOnchainAccountFinal && !loadingOnchainAccount) {
      handleOpenCreateAccount();
      return;
    }

    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setAmount("");
  };

  const handleCreateUser = async () => {
    if (!solanaWallet) {
      enqueueSnackbar("No Solana wallet connected", { variant: "error" });
      return;
    }

    try {
      const signature = await createUser();
      enqueueSnackbar(`User account created! Transaction: ${signature.slice(0, 8)}...`, {
        variant: "success",
      });
      handleCloseDialog();

      // Refresh data after successful creation
      if (identityToken) {
        setTimeout(() => {
          refreshMe(identityToken);
          if (solanaWallet.address) {
            const userPubkey = new PublicKey(solanaWallet.address);
            fetchOnchainAccountStatus(userPubkey);
            fetchVaultBalance(userPubkey, BLING_MINT);
          }
        }, 2000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user account";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleDeposit = async () => {
    if (!solanaWallet) {
      enqueueSnackbar("No Solana wallet connected", { variant: "error" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "error" });
      return;
    }

    try {
      const signature = await deposit(amountNum, BLING_MINT);
      enqueueSnackbar(`Deposit successful! Transaction: ${signature.slice(0, 8)}...`, {
        variant: "success",
      });
      handleCloseDialog();

      // Refresh balance after deposit
      if (identityToken) {
        setTimeout(() => {
          refreshMe(identityToken);
          if (solanaWallet.address) {
            const userPubkey = new PublicKey(solanaWallet.address);
            fetchVaultBalance(userPubkey, BLING_MINT);
          }
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to deposit";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleWithdraw = async () => {
    if (!solanaWallet) {
      enqueueSnackbar("No Solana wallet connected", { variant: "error" });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "error" });
      return;
    }

    if (displayBalance !== null && amountNum > displayBalance) {
      enqueueSnackbar("Insufficient vault balance", { variant: "error" });
      return;
    }

    try {
      const signature = await withdraw(amountNum, BLING_MINT);
      enqueueSnackbar(`Withdraw successful! Transaction: ${signature.slice(0, 8)}...`, {
        variant: "success",
      });
      handleCloseDialog();

      // Refresh balance after withdraw
      if (identityToken) {
        setTimeout(() => {
          refreshMe(identityToken);
          if (solanaWallet.address) {
            const userPubkey = new PublicKey(solanaWallet.address);
            fetchVaultBalance(userPubkey, BLING_MINT);
          }
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to withdraw";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const isLoading = depositLoading || withdrawLoading || createUserLoading || loadingOnchainAccount;

  // Handle login button click
  const handleLogin = () => {
    login();
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Show login button if not authenticated */}
        {!authenticated ? (
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<LoginIcon />}
            onClick={handleLogin}
            sx={{ minWidth: 100 }}
          >
            Log in
          </Button>
        ) : (
          <>
            {/* Vault Balance Display - only show if authenticated */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: "action.hover",
              }}
            >
              <WalletIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                Vault:
              </Typography>
              {loadingVaultBalance || queryLoading ? (
                <CircularProgress size={14} />
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {displayBalance !== null ? displayBalance.toLocaleString() : "N/A"}
                </Typography>
              )}
            </Box>

            {/* Show Create Account button if no on-chain account, otherwise show Deposit/Withdraw */}
            {!hasOnchainAccountFinal && !queryLoading && !loadingOnchainAccount ? (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AccountCircleIcon />}
                onClick={handleOpenCreateAccount}
                sx={{ minWidth: 140 }}
              >
                Create Account
              </Button>
            ) : (
              <>
                {/* Deposit Button */}
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog("deposit")}
                  sx={{ minWidth: 100 }}
                  disabled={queryLoading || loadingOnchainAccount}
                >
                  Deposit
                </Button>

                {/* Withdraw Button */}
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<RemoveIcon />}
                  onClick={() => handleOpenDialog("withdraw")}
                  sx={{ minWidth: 100 }}
                  disabled={queryLoading || loadingOnchainAccount}
                >
                  Withdraw
                </Button>
              </>
            )}
          </>
        )}
      </Box>

      {/* Deposit/Withdraw/Create User Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6">
            {dialogMode === "create"
              ? "Create On-Chain User Account"
              : dialogMode === "deposit"
                ? "Deposit to Vault"
                : "Withdraw from Vault"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {dialogMode === "create" ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  You need to create an on-chain user account before you can deposit or withdraw
                  tokens. This is a one-time setup that will create your vault account on the
                  Solana blockchain.
                </Typography>
                {createUserError && (
                  <Typography variant="body2" color="error">
                    Error: {createUserError}
                  </Typography>
                )}
              </>
            ) : (
              <>
                {/* Current Balance */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: "action.hover",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Vault Balance
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {loadingVaultBalance || queryLoading ? (
                      <CircularProgress size={20} />
                    ) : displayBalance !== null ? (
                      displayBalance.toLocaleString()
                    ) : (
                      "N/A"
                    )}
                  </Typography>
                </Box>

                {/* Amount Input */}
                <TextField
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  fullWidth
                  disabled={isLoading}
                  inputProps={{
                    min: 0,
                    step: 0.000000001,
                  }}
                  helperText={
                    dialogMode === "withdraw" && displayBalance !== null
                      ? `Maximum: ${displayBalance.toLocaleString()}`
                      : undefined
                  }
                />

                {/* Error Messages */}
                {depositError && dialogMode === "deposit" && (
                  <Typography variant="body2" color="error">
                    Deposit error: {depositError}
                  </Typography>
                )}
                {withdrawError && dialogMode === "withdraw" && (
                  <Typography variant="body2" color="error">
                    Withdraw error: {withdrawError}
                  </Typography>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={isLoading}>
            Cancel
          </Button>
          {dialogMode === "create" ? (
            <Button
              onClick={handleCreateUser}
              variant="contained"
              color="primary"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
              {isLoading ? "Creating..." : "Create Account"}
            </Button>
          ) : (
            <Button
              onClick={dialogMode === "deposit" ? handleDeposit : handleWithdraw}
              variant="contained"
              color={dialogMode === "deposit" ? "success" : "error"}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
              {isLoading
                ? dialogMode === "deposit"
                  ? "Depositing..."
                  : "Withdrawing..."
                : dialogMode === "deposit"
                  ? "Deposit"
                  : "Withdraw"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
