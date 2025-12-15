"use client";

import "@/theme/types"; // Import type declarations
import { usePrivy } from "@privy-io/react-auth";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Avatar,
    Grid,
    Chip,
    Divider,
    Button,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import { TrendingUp, AccountBalance, CheckCircle, Cancel, Wallet as WalletIcon } from "@mui/icons-material";
import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { useIdentityToken } from "@privy-io/react-auth";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useWalletTokenBalances } from "@/hooks/useWalletTokenBalances";
import { useCanonicalVoteCosts } from "@/hooks/useCanonicalVoteCosts";
import {
    formatSocialScore,
    formatTokenBalance,
    getTokenName,
} from "@/lib/utils/formatting";
import { TokenDisplay, TokenLogo } from "@/components/tokens";
import { getTokenConfig } from "@/lib/utils/tokens";
import { graphqlRequest } from "@/lib/graphql/client";
import {
    UPDATE_DEFAULT_PAYMENT_TOKEN_MUTATION,
    UpdateDefaultPaymentTokenResult,
    UPDATE_LANGUAGE_MUTATION,
    UpdateLanguageResult,
} from "@/lib/graphql/users/mutations";
import { Language } from "@/lib/graphql/types";
import {
    BLING_MINT_STR,
    USDC_MINT_STR,
    STABLECOIN_MINT_STR,
} from "@/lib/config/tokens";

function SettingsContent() {
    const { ready, authenticated } = usePrivy();
    const { user: backendUser, isLoading, error, refreshMe } = useBackendUserStore();
    const { identityToken } = useIdentityToken();
    const [updatingToken, setUpdatingToken] = useState(false);
    const [updatingLanguage, setUpdatingLanguage] = useState(false);

    // Get wallet token balances
    const mintAddresses = [BLING_MINT_STR, USDC_MINT_STR, STABLECOIN_MINT_STR].filter(Boolean);
    const { balances, loading: loadingBalances } = useWalletTokenBalances(
        mintAddresses,
        USDC_MINT_STR,
        STABLECOIN_MINT_STR
    );

    // Get canonical vote costs in multiple tokens
    const { costs: pumpCosts, loading: loadingPumpCosts, error: pumpCostError } = useCanonicalVoteCosts("Pump");
    const { costs: smackCosts, loading: loadingSmackCosts, error: smackCostError } = useCanonicalVoteCosts("Smack");

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated) {
        return <LoginPrompt />;
    }

    // Get token decimals from token configs (centralized)
    const blingTokenConfig = getTokenConfig(BLING_MINT_STR, BLING_MINT_STR, USDC_MINT_STR, STABLECOIN_MINT_STR);
    const usdcTokenConfig = USDC_MINT_STR ? getTokenConfig(USDC_MINT_STR, BLING_MINT_STR, USDC_MINT_STR, STABLECOIN_MINT_STR) : null;
    const stablecoinTokenConfig = STABLECOIN_MINT_STR ? getTokenConfig(STABLECOIN_MINT_STR, BLING_MINT_STR, USDC_MINT_STR, STABLECOIN_MINT_STR) : null;

    const blingDecimals = blingTokenConfig?.metadata.decimals ?? 9;
    const usdcDecimals = usdcTokenConfig?.metadata.decimals ?? 6;
    const stablecoinDecimals = stablecoinTokenConfig?.metadata.decimals ?? 6;

    // Handle default payment token update
    const handleUpdateDefaultToken = async (tokenMint: string | null) => {
        if (!identityToken) return;

        setUpdatingToken(true);
        try {
            await graphqlRequest<UpdateDefaultPaymentTokenResult>(
                UPDATE_DEFAULT_PAYMENT_TOKEN_MUTATION,
                { input: { tokenMint } },
                identityToken
            );
            // Refresh user data to get updated default payment token
            await refreshMe(identityToken);
        } catch (err) {
            console.error("Failed to update default payment token:", err);
            alert("Failed to update default payment token");
        } finally {
            setUpdatingToken(false);
        }
    };

    // Get current default payment token (defaults to BLING if null)
    const currentDefaultToken = backendUser?.defaultPaymentToken || BLING_MINT_STR;

    // Get current language (defaults to CANTONESE)
    const currentLanguage = (backendUser?.language as Language) || Language.CANTONESE;

    // Handle language update
    const handleUpdateLanguage = async (language: Language) => {
        if (!identityToken) return;

        setUpdatingLanguage(true);
        try {
            await graphqlRequest<UpdateLanguageResult>(
                UPDATE_LANGUAGE_MUTATION,
                { language },
                identityToken
            );
            // Refresh user data to get updated language
            await refreshMe(identityToken);
        } catch (err) {
            console.error("Failed to update language:", err);
            alert("Failed to update language");
        } finally {
            setUpdatingLanguage(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Alert>
            )}

            {backendUser && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {/* Profile Header */}
                    <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                        <Card>
                            <CardContent>
                                <Stack spacing={3}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Avatar
                                            src={backendUser.profile?.avatarUrl || undefined}
                                            sx={{
                                                width: 100,
                                                height: 100,
                                                bgcolor: "primary.main",
                                                fontSize: "2.5rem",
                                            }}
                                        >
                                            {backendUser.profile?.displayName
                                                ?.charAt(0)
                                                .toUpperCase() || "U"}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                {backendUser.profile?.displayName || "User"}
                                            </Typography>
                                            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                                                @{backendUser.profile?.handle || "unknown"}
                                            </Typography>
                                            {backendUser.profile?.bio && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {backendUser.profile.bio}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* On-Chain Stats */}
                    <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                    <TrendingUp sx={{ fontSize: 20 }} />
                                    On-Chain Stats
                                </Typography>
                                <Stack spacing={2}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Account Status:
                                        </Typography>
                                        {backendUser.hasOnchainAccount ? (
                                            <Chip
                                                icon={<CheckCircle />}
                                                label="Active"
                                                color="success"
                                                size="small"
                                            />
                                        ) : (
                                            <Chip
                                                icon={<Cancel />}
                                                label="Not Created"
                                                color="default"
                                                size="small"
                                            />
                                        )}
                                    </Box>

                                    <Divider />

                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Social Score:
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {formatSocialScore(backendUser.socialScore)}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Vault Balances:
                                        </Typography>
                                        <Stack spacing={1} sx={{ mt: 1 }}>
                                            {/* BLING Balance */}
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <TokenDisplay
                                                    mint={BLING_MINT_STR}
                                                    blingMint={BLING_MINT_STR}
                                                    usdcMint={USDC_MINT_STR}
                                                    stablecoinMint={STABLECOIN_MINT_STR}
                                                    size="small"
                                                />
                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                    {backendUser.vaultBalances?.bling !== null && backendUser.vaultBalances?.bling !== undefined
                                                        ? formatTokenBalance(backendUser.vaultBalances.bling, blingDecimals)
                                                        : backendUser.vaultBalance !== null
                                                            ? formatTokenBalance(backendUser.vaultBalance, blingDecimals)
                                                            : "N/A"}
                                                </Typography>
                                            </Box>
                                            {/* USDC Balance */}
                                            {USDC_MINT_STR && backendUser.vaultBalances?.usdc !== null && (
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <TokenDisplay
                                                        mint={USDC_MINT_STR}
                                                        blingMint={BLING_MINT_STR}
                                                        usdcMint={USDC_MINT_STR}
                                                        stablecoinMint={STABLECOIN_MINT_STR}
                                                        size="small"
                                                    />
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                        {formatTokenBalance(backendUser.vaultBalances.usdc, usdcDecimals)}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {/* Stablecoin Balance */}
                                            {STABLECOIN_MINT_STR && backendUser.vaultBalances?.stablecoin !== null && (
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <TokenDisplay
                                                        mint={STABLECOIN_MINT_STR}
                                                        blingMint={BLING_MINT_STR}
                                                        usdcMint={USDC_MINT_STR}
                                                        stablecoinMint={STABLECOIN_MINT_STR}
                                                        size="small"
                                                    />
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                        {formatTokenBalance(backendUser.vaultBalances.stablecoin, stablecoinDecimals)}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                                            Default Payment Token:
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={currentDefaultToken}
                                            exclusive
                                            onChange={(_, value) => {
                                                if (value !== null) {
                                                    handleUpdateDefaultToken(value === BLING_MINT_STR ? null : value);
                                                }
                                            }}
                                            disabled={updatingToken}
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

                                    <Divider />

                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                                            Script Rendering Mode:
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={currentLanguage}
                                            exclusive
                                            onChange={(_, value) => {
                                                if (value !== null) {
                                                    handleUpdateLanguage(value);
                                                }
                                            }}
                                            disabled={updatingLanguage}
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
                                            <ToggleButton value={Language.CANTONESE} aria-label="Cantonese">
                                                <Typography variant="body2" sx={{ fontWeight: 500, py: 1 }}>
                                                    Cantonese (Jyutcitzi / 粵切字)
                                                </Typography>
                                            </ToggleButton>
                                            <ToggleButton value={Language.GOETSUAN} aria-label="Goetsuan">
                                                <Typography variant="body2" sx={{ fontWeight: 500, py: 1 }}>
                                                    Goetsuan
                                                </Typography>
                                            </ToggleButton>
                                            <ToggleButton value={Language.NONE} aria-label="None">
                                                <Typography variant="body2" sx={{ fontWeight: 500, py: 1 }}>
                                                    None (standard Unicode text)
                                                </Typography>
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Canonical Vote Cost:
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                                            Base cost for voting on a new post (0 votes, no previous votes)
                                        </Typography>
                                        <Stack spacing={2} sx={{ mt: 1 }}>
                                            {/* Pump Costs */}
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                                    Pump:
                                                </Typography>
                                                {loadingPumpCosts ? (
                                                    <CircularProgress size={16} />
                                                ) : pumpCostError ? (
                                                    <Typography variant="caption" color="error">
                                                        Error loading costs
                                                    </Typography>
                                                ) : pumpCosts ? (
                                                    <Stack spacing={0.5}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                            <Typography variant="body2" sx={{ color: "success.main" }}>
                                                                {formatTokenBalance(pumpCosts.bling, blingDecimals)}
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
                                                        {pumpCosts.usdc !== null && (
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {formatTokenBalance(pumpCosts.usdc, usdcDecimals)}
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
                                                        {pumpCosts.stablecoin !== null && (
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {formatTokenBalance(pumpCosts.stablecoin, stablecoinDecimals)}
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
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        N/A
                                                    </Typography>
                                                )}
                                            </Box>
                                            {/* Smack Costs */}
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                                                    Smack:
                                                </Typography>
                                                {loadingSmackCosts ? (
                                                    <CircularProgress size={16} />
                                                ) : smackCostError ? (
                                                    <Typography variant="caption" color="error">
                                                        Error loading costs
                                                    </Typography>
                                                ) : smackCosts ? (
                                                    <Stack spacing={0.5}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                            <Typography variant="body2" sx={{ color: "error.main" }}>
                                                                {formatTokenBalance(smackCosts.bling, blingDecimals)}
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
                                                        {smackCosts.usdc !== null && (
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {formatTokenBalance(smackCosts.usdc, usdcDecimals)}
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
                                                        {smackCosts.stablecoin !== null && (
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {formatTokenBalance(smackCosts.stablecoin, stablecoinDecimals)}
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
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        N/A
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Wallet Info */}
                    <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                    <AccountBalance sx={{ fontSize: 20 }} />
                                    Wallet
                                </Typography>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Address:
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: "monospace",
                                                wordBreak: "break-all",
                                                bgcolor: "background.paper",
                                                p: 1,
                                                borderRadius: 1,
                                            }}
                                        >
                                            {backendUser.wallet}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Wallet Token Balances */}
                    <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                    <WalletIcon sx={{ fontSize: 20 }} />
                                    Wallet Token Balances
                                </Typography>
                                {loadingBalances ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                                        <CircularProgress size={24} />
                                    </Box>
                                ) : (
                                    <Stack spacing={2}>
                                        {mintAddresses.map((mint) => {
                                            const balance = balances[mint];
                                            const tokenName = getTokenName(
                                                mint,
                                                BLING_MINT_STR,
                                                USDC_MINT_STR,
                                                STABLECOIN_MINT_STR
                                            );

                                            if (!balance) return null;

                                            return (
                                                <Box key={mint}>
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <TokenDisplay
                                                            mint={mint}
                                                            blingMint={BLING_MINT_STR}
                                                            usdcMint={USDC_MINT_STR}
                                                            stablecoinMint={STABLECOIN_MINT_STR}
                                                            size="small"
                                                        />
                                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                            {balance.loading ? (
                                                                <CircularProgress size={16} />
                                                            ) : balance.error ? (
                                                                <Typography variant="body2" color="error">
                                                                    Error
                                                                </Typography>
                                                            ) : (
                                                                formatTokenBalance(balance.balance, balance.decimals)
                                                            )}
                                                        </Typography>
                                                    </Box>
                                                    {balance.error && (
                                                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                                                            {balance.error}
                                                        </Typography>
                                                    )}
                                                    {mintAddresses.indexOf(mint) < mintAddresses.length - 1 && <Divider sx={{ mt: 1 }} />}
                                                </Box>
                                            );
                                        })}
                                        {mintAddresses.length === 0 && (
                                            <Alert severity="info" sx={{ mt: 1 }}>
                                                No token mints configured. Please set NEXT_PUBLIC_USDC_MINT_STR and NEXT_PUBLIC_STABLECOIN_MINT_STR environment variables to view balances.
                                            </Alert>
                                        )}
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            )
            }

            {
                !backendUser && !isLoading && (
                    <Alert severity="info">
                        No profile data available. Please complete onboarding.
                    </Alert>
                )
            }
        </Box >
    );
}

export default function Settings() {
    return <SettingsContent />;
}

