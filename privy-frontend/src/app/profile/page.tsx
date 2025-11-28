"use client";

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
} from "@mui/material";
import { TrendingUp, AccountBalance, CheckCircle, Cancel } from "@mui/icons-material";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

function ProfileContent() {
    const { ready, authenticated } = usePrivy();
    const { user: backendUser, isLoading, error } = useBackendUserStore();

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated) {
        return <LoginPrompt />;
    }

    const formatBalance = (balance: number | null | undefined) => {
        if (balance === null || balance === undefined) return "N/A";
        return (balance / 1_000_000_000).toFixed(4);
    };

    const formatSocialScore = (score: number | null | undefined) => {
        if (score === null || score === undefined) return "N/A";
        return score.toLocaleString();
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
                <Grid container spacing={3}>
                    {/* Profile Header */}
                    <Grid item xs={12}>
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
                    </Grid>

                    {/* On-Chain Stats */}
                    <Grid item xs={12} md={6}>
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

                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Vault Balance:
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {formatBalance(backendUser.vaultBalance)} BLING
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Wallet Info */}
                    <Grid item xs={12} md={6}>
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
                                                bgcolor: "grey.100",
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
                    </Grid>
                </Grid>
            )}

            {!backendUser && !isLoading && (
                <Alert severity="info">
                    No profile data available. Please complete onboarding.
                </Alert>
            )}
        </Box>
    );
}

export default function Profile() {
    return <ProfileContent />;
}

