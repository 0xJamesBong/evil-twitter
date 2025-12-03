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
import { useOnboardUser } from "../../hooks/useOnboardUser";
import { useBackendUserStore } from "../../lib/stores/backendUserStore";
import { useSolanaStore } from "../../lib/stores/solanaStore";
import { NetworkSwitcher } from "./NetworkSwitcher";

import { formatTokenBalance } from "../../lib/utils/formatting";

// Default BLING mint - should match backend
const BLING_MINT = new PublicKey("bbb9w3ZidNJJGm4TKbhkCXqB9XSnzsjTedmJ5F2THX8");

export function VaultNavbar() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { identityToken } = useIdentityToken();

  // Try to find Privy embedded wallet first, then fall back to any Solana wallet
  // Note: useWallets() from @privy-io/react-auth/solana already returns only Solana wallets
  // so we don't need to check chainType
  const solanaWallet =
    wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

  const { deposit, loading: depositLoading, error: depositError } = useDeposit();
  const { withdraw, loading: withdrawLoading, error: withdrawError } = useWithdraw();
  const { createUser, loading: createUserLoading, error: createUserError } = useCreateUser();
  const { onboardUser, loading: onboardUserLoading, error: onboardUserError } = useOnboardUser();
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

  // Debug logging to help diagnose wallet detection issues
  useEffect(() => {
    console.log("VaultNavbar - Wallets:", wallets);
    console.log("VaultNavbar - Selected wallet:", solanaWallet);
    console.log("VaultNavbar - Authenticated:", authenticated);
  }, [wallets, solanaWallet, authenticated]);

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
  const [handle, setHandle] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  // Use GraphQL balance if available, otherwise use chain balance from solanaStore
  const graphqlVaultBalance = user?.vaultBalance ?? null;
  const chainVaultBalance = vaultBalances[BLING_MINT.toBase58()] ?? null;
  const displayBalance = graphqlVaultBalance !== null ? graphqlVaultBalance : chainVaultBalance;

  // BLING uses 9 decimals - convert raw balance to human-readable for display
  const displayBalanceFormatted = displayBalance !== null
    ? formatTokenBalance(displayBalance, 9)
    : "N/A";

  // Convert human-readable balance to raw units for comparison
  const displayBalanceInRawUnits = displayBalance !== null ? displayBalance : 0;

  // Determine if user has on-chain account (prefer GraphQL, fallback to solanaStore)
  const hasOnchainAccountFromGraphQL = user?.hasOnchainAccount ?? null;
  const hasOnchainAccountFinal =
    hasOnchainAccountFromGraphQL !== null ? hasOnchainAccountFromGraphQL : hasOnchainAccount;

  const handleOpenCreateAccount = () => {
    if (!authenticated) {
      enqueueSnackbar("Please log in first", { variant: "error" });
      return;
    }
    if (!solanaWallet) {
      enqueueSnackbar(
        "Please connect a Solana wallet. You may need to create a Solana wallet in your Privy account.",
        { variant: "error" }
      );
      return;
    }
    setDialogMode("create");
    setDialogOpen(true);
    // Pre-fill handle and displayName from wallet address if available
    if (solanaWallet?.address) {
      const addr = solanaWallet.address;
      setHandle(`user_${addr.slice(0, 8)}`);
      setDisplayName("User");
    } else {
      setHandle("");
      setDisplayName("");
    }
  };

  const handleOpenDialog = (mode: "deposit" | "withdraw") => {
    if (!authenticated) {
      enqueueSnackbar("Please log in first", { variant: "error" });
      return;
    }
    if (!solanaWallet) {
      enqueueSnackbar(
        "Please connect a Solana wallet. You may need to create a Solana wallet in your Privy account.",
        { variant: "error" }
      );
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
    if (!authenticated) {
      enqueueSnackbar("Please log in first", { variant: "error" });
      return;
    }
    if (!solanaWallet) {
      enqueueSnackbar(
        "Please connect a Solana wallet. You may need to create a Solana wallet in your Privy account.",
        { variant: "error" }
      );
      return;
    }

    // Validate handle and displayName
    if (!handle.trim()) {
      enqueueSnackbar("Please enter a handle", { variant: "error" });
      return;
    }
    if (!displayName.trim()) {
      enqueueSnackbar("Please enter a display name", { variant: "error" });
      return;
    }

    try {
      // This will immediately prompt the user to sign the message
      const result = await onboardUser(handle.trim(), displayName.trim());
      enqueueSnackbar(
        `Account created successfully! Session registered for 30 days.`,
        { variant: "success" }
      );
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
        error instanceof Error ? error.message : "Failed to create account";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleDeposit = async () => {
    if (!authenticated) {
      enqueueSnackbar("Please log in first", { variant: "error" });
      return;
    }
    if (!solanaWallet) {
      enqueueSnackbar(
        "Please connect a Solana wallet. You may need to create a Solana wallet in your Privy account.",
        { variant: "error" }
      );
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
    if (!authenticated) {
      enqueueSnackbar("Please log in first", { variant: "error" });
      return;
    }
    if (!solanaWallet) {
      enqueueSnackbar(
        "Please connect a Solana wallet. You may need to create a Solana wallet in your Privy account.",
        { variant: "error" }
      );
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      enqueueSnackbar("Please enter a valid amount", { variant: "error" });
      return;
    }

    // Convert user input (human-readable) to raw units for comparison
    const amountInRawUnits = Math.floor(amountNum * Math.pow(10, 9));
    if (displayBalance !== null && amountInRawUnits > displayBalance) {
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

  const isLoading = depositLoading || withdrawLoading || createUserLoading || onboardUserLoading || loadingOnchainAccount;

  // Handle login button click
  const handleLogin = () => {
    login();
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        {/* Show login button if not authenticated */}
        {!authenticated ? (
          <>
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
            <NetworkSwitcher />

          </>
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
                  {displayBalance !== null ? formatTokenBalance
                    (displayBalance, 9) : "N/A"}
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

            {/* Network Switcher - always visible */}
            <NetworkSwitcher />

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
              ? "Onboard Account"
              : dialogMode === "deposit"
                ? "Deposit to Vault"
                : "Withdraw from Vault"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {dialogMode === "create" ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your account and register a session key. You'll be prompted to sign a message
                  to verify your wallet ownership. This is a one-time setup.
                </Typography>

                {/* Handle Input */}
                <TextField
                  label="Handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="Enter your handle"
                  fullWidth
                  disabled={isLoading}
                  required
                  helperText="Your unique username (e.g., @username)"
                />

                {/* Display Name Input */}
                <TextField
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  fullWidth
                  disabled={isLoading}
                  required
                  helperText="Your public display name"
                />

                {(createUserError || onboardUserError) && (
                  <Typography variant="body2" color="error">
                    Error: {onboardUserError || createUserError}
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
                    ) : (
                      displayBalanceFormatted
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
                      ? `Maximum: ${displayBalanceFormatted} BLING`
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
              {isLoading ? "Onboarding..." : "Onboard & Create Account"}
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
