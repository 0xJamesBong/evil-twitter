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
  ToggleButton,
  ToggleButtonGroup,
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
import { useWalletTokenBalances } from "../../hooks/useWalletTokenBalances";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { AmountInputWithSlider } from "./AmountInputWithSlider";

import { formatTokenBalance } from "../../lib/utils/formatting";
import { TokenDisplay, TokenLogo } from "../tokens";
import { getTokenConfig } from "../../lib/utils/tokens";

// Token mints - should match backend
const BLING_MINT_STR = process.env.NEXT_PUBLIC_BLING_MINT || "bbb9w3ZidNJJGm4TKbhkCXqB9XSnzsjTedmJ5F2THX8";
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT || "";
const STABLECOIN_MINT_STR = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

const BLING_MINT = new PublicKey(BLING_MINT_STR);
const USDC_MINT = USDC_MINT_STR ? new PublicKey(USDC_MINT_STR) : null;
const STABLECOIN_MINT = STABLECOIN_MINT_STR ? new PublicKey(STABLECOIN_MINT_STR) : null;

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

  // Get all available token mints
  const availableTokenMints = [
    BLING_MINT_STR,
    ...(USDC_MINT_STR ? [USDC_MINT_STR] : []),
    ...(STABLECOIN_MINT_STR ? [STABLECOIN_MINT_STR] : []),
  ].filter(Boolean);

  // Get wallet token balances for all tokens
  const { balances: walletBalances, loading: loadingWalletBalances } = useWalletTokenBalances(
    availableTokenMints,
    USDC_MINT_STR,
    STABLECOIN_MINT_STR
  );

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

  // Fetch on-chain account status and vault balances for all tokens when wallet is available
  useEffect(() => {
    if (authenticated && solanaWallet?.address) {
      const userPubkey = new PublicKey(solanaWallet.address);
      fetchOnchainAccountStatus(userPubkey);
      // Fetch balances for all available tokens
      fetchVaultBalance(userPubkey, BLING_MINT);
      if (USDC_MINT) {
        fetchVaultBalance(userPubkey, USDC_MINT);
      }
      if (STABLECOIN_MINT) {
        fetchVaultBalance(userPubkey, STABLECOIN_MINT);
      }
    }
  }, [authenticated, solanaWallet?.address, fetchOnchainAccountStatus, fetchVaultBalance]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"deposit" | "withdraw" | "create">("deposit");
  const [amount, setAmount] = useState<string>("");
  const [handle, setHandle] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [selectedTokenMint, setSelectedTokenMint] = useState<string>(BLING_MINT_STR);

  // Get selected token config
  const selectedTokenConfig = getTokenConfig(
    selectedTokenMint,
    BLING_MINT_STR,
    USDC_MINT_STR,
    STABLECOIN_MINT_STR
  );
  const selectedTokenDecimals = selectedTokenConfig?.metadata.decimals ?? 9;
  const selectedTokenMintPubkey = new PublicKey(selectedTokenMint);

  // Get vault balances from GraphQL (preferred) or fallback to chain balances
  const getVaultBalance = (mint: string): number | null => {
    // Try GraphQL vaultBalances first
    if (user?.vaultBalances) {
      if (mint === BLING_MINT_STR) return user.vaultBalances.bling;
      if (mint === USDC_MINT_STR && user.vaultBalances.usdc !== null) return user.vaultBalances.usdc;
      if (mint === STABLECOIN_MINT_STR && user.vaultBalances.stablecoin !== null) return user.vaultBalances.stablecoin;
    }
    // Fallback to legacy vaultBalance (BLING only) or chain balance
    if (mint === BLING_MINT_STR && user?.vaultBalance !== null && user?.vaultBalance !== undefined) {
      return user.vaultBalance;
    }
    // Fallback to chain balance
    return vaultBalances[mint] ?? null;
  };

  const displayBalance = getVaultBalance(selectedTokenMint);

  // Get wallet balance for deposits
  const walletBalanceRaw = walletBalances[selectedTokenMint]?.balance ?? null;
  const walletBalanceDecimals = walletBalances[selectedTokenMint]?.decimals ?? selectedTokenDecimals;

  // Convert raw balance to human-readable for display
  const displayBalanceFormatted = displayBalance !== null
    ? formatTokenBalance(displayBalance, selectedTokenDecimals)
    : "N/A";

  const walletBalanceFormatted = walletBalanceRaw !== null
    ? formatTokenBalance(walletBalanceRaw, walletBalanceDecimals)
    : "N/A";

  // Convert human-readable balance to raw units for comparison
  const displayBalanceInRawUnits = displayBalance !== null ? displayBalance : 0;
  const walletBalanceInRawUnits = walletBalanceRaw !== null ? walletBalanceRaw : 0;

  // Get max available amount based on mode
  const maxAmount = dialogMode === "deposit"
    ? walletBalanceInRawUnits / Math.pow(10, walletBalanceDecimals)
    : displayBalanceInRawUnits / Math.pow(10, selectedTokenDecimals);

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
    setAmount("");
    setSelectedTokenMint(BLING_MINT_STR); // Reset to BLING when opening dialog
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setAmount("");
  };

  // Handle amount change from AmountInputWithSlider
  const handleAmountChange = (value: string) => {
    setAmount(value);
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
      const signature = await deposit(amountNum, selectedTokenMintPubkey);
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
            fetchVaultBalance(userPubkey, selectedTokenMintPubkey);
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
    const amountInRawUnits = Math.floor(amountNum * Math.pow(10, selectedTokenDecimals));
    if (displayBalance !== null && amountInRawUnits > displayBalance) {
      enqueueSnackbar("Insufficient vault balance", { variant: "error" });
      return;
    }

    try {
      const signature = await withdraw(amountNum, selectedTokenMintPubkey);
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
            fetchVaultBalance(userPubkey, selectedTokenMintPubkey);
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
            {/* Vault Balances Display - show all tokens */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <WalletIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                Vault:
              </Typography>
              {loadingVaultBalance || queryLoading ? (
                <CircularProgress size={14} />
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  {/* BLING Balance */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {getVaultBalance(BLING_MINT_STR) !== null
                        ? formatTokenBalance(getVaultBalance(BLING_MINT_STR)!, 9)
                        : "N/A"}
                    </Typography>
                    <TokenDisplay
                      mint={BLING_MINT_STR}
                      blingMint={BLING_MINT_STR}
                      usdcMint={USDC_MINT_STR}
                      stablecoinMint={STABLECOIN_MINT_STR}
                      size="small"
                      showSymbol
                    />
                  </Box>
                  {/* USDC Balance */}
                  {USDC_MINT_STR && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {getVaultBalance(USDC_MINT_STR) !== null
                          ? formatTokenBalance(getVaultBalance(USDC_MINT_STR)!, 6)
                          : "N/A"}
                      </Typography>
                      <TokenDisplay
                        mint={USDC_MINT_STR}
                        blingMint={BLING_MINT_STR}
                        usdcMint={USDC_MINT_STR}
                        stablecoinMint={STABLECOIN_MINT_STR}
                        size="small"
                        showSymbol
                      />
                    </Box>
                  )}
                  {/* Stablecoin Balance */}
                  {STABLECOIN_MINT_STR && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {getVaultBalance(STABLECOIN_MINT_STR) !== null
                          ? formatTokenBalance(getVaultBalance(STABLECOIN_MINT_STR)!, 6)
                          : "N/A"}
                      </Typography>
                      <TokenDisplay
                        mint={STABLECOIN_MINT_STR}
                        blingMint={BLING_MINT_STR}
                        usdcMint={USDC_MINT_STR}
                        stablecoinMint={STABLECOIN_MINT_STR}
                        size="small"
                        showSymbol
                      />
                    </Box>
                  )}
                </Box>
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
                {/* Token Selection */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                    Select Token:
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedTokenMint}
                    exclusive
                    onChange={(_, value) => {
                      if (value !== null) {
                        setSelectedTokenMint(value);
                        setAmount(""); // Reset amount when changing token
                      }
                    }}
                    disabled={isLoading}
                    fullWidth
                    sx={{
                      display: "flex",
                      gap: 1,
                      "& .MuiToggleButtonGroup-grouped": {
                        border: "1px solid",
                        borderColor: "divider",
                        flex: 1,
                        "&:not(:first-of-type)": {
                          borderLeft: "1px solid",
                          borderColor: "divider",
                          marginLeft: 0,
                        },
                        "&.Mui-selected": {
                          backgroundColor: "primary.main",
                          color: "primary.contrastText",
                          "&:hover": {
                            backgroundColor: "primary.dark",
                          },
                        },
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      },
                    }}
                  >
                    <ToggleButton value={BLING_MINT_STR} aria-label="BLING">
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 1 }}>
                        <TokenLogo
                          mint={BLING_MINT_STR}
                          blingMint={BLING_MINT_STR}
                          usdcMint={USDC_MINT_STR}
                          stablecoinMint={STABLECOIN_MINT_STR}
                          size={24}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          BLING
                        </Typography>
                      </Box>
                    </ToggleButton>
                    {USDC_MINT_STR && (
                      <ToggleButton value={USDC_MINT_STR} aria-label="USDC">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 1 }}>
                          <TokenLogo
                            mint={USDC_MINT_STR}
                            blingMint={BLING_MINT_STR}
                            usdcMint={USDC_MINT_STR}
                            stablecoinMint={STABLECOIN_MINT_STR}
                            size={24}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            USDC
                          </Typography>
                        </Box>
                      </ToggleButton>
                    )}
                    {STABLECOIN_MINT_STR && (
                      <ToggleButton value={STABLECOIN_MINT_STR} aria-label="Stablecoin">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 1 }}>
                          <TokenLogo
                            mint={STABLECOIN_MINT_STR}
                            blingMint={BLING_MINT_STR}
                            usdcMint={USDC_MINT_STR}
                            stablecoinMint={STABLECOIN_MINT_STR}
                            size={24}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            Stablecoin
                          </Typography>
                        </Box>
                      </ToggleButton>
                    )}
                  </ToggleButtonGroup>
                </Box>

                <AmountInputWithSlider
                  amount={amount}
                  onAmountChange={handleAmountChange}
                  maxAmount={maxAmount}
                  balanceLabel={dialogMode === "deposit" ? "Wallet Balance" : "Vault Balance"}
                  balanceFormatted={
                    dialogMode === "deposit" ? walletBalanceFormatted : displayBalanceFormatted
                  }
                  balanceLoading={
                    dialogMode === "deposit"
                      ? loadingWalletBalances
                      : loadingVaultBalance || queryLoading
                  }
                  balanceAvailableText={
                    dialogMode === "deposit"
                      ? walletBalanceRaw !== null
                        ? "Available to deposit"
                        : ""
                      : displayBalance !== null
                        ? "Available to withdraw"
                        : ""
                  }
                  mode={dialogMode}
                  disabled={isLoading}
                  decimals={dialogMode === "deposit" ? walletBalanceDecimals : selectedTokenDecimals}
                  tokenSymbol={selectedTokenConfig?.metadata.symbol || "BLING"}
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

