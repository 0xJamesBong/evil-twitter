"use client";

import "@/theme/types";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
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
import {
    TrendingUp,
    AccountBalance,
    CheckCircle,
    Cancel,
    Wallet as WalletIcon,
    Edit as EditIcon,
    PersonAdd as PersonAddIcon,
    PersonRemove as PersonRemoveIcon,
} from "@mui/icons-material";
import { PublicKey } from "@solana/web3.js";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { useWalletTokenBalances } from "@/hooks/useWalletTokenBalances";
import { useCanonicalVoteCosts } from "@/hooks/useCanonicalVoteCosts";
import { useFollowUser } from "@/hooks/useFollowUser";
import {
    formatSocialScore,
    formatTokenBalance,
    getTokenName,
} from "@/lib/utils/formatting";
import { TokenDisplay, TokenLogo } from "@/components/tokens";
import { getTokenConfig } from "@/lib/utils/tokens";
import { TweetCard } from "@/components/tweets/TweetCard";
import { UserByHandleResult, UserByIdResult } from "@/lib/graphql/users/queries";
import { TweetNode } from "@/lib/graphql/tweets/types";

// Token mint addresses
const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";
const STABLECOIN_MINT = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

type UserData = (UserByHandleResult["userByHandle"] | UserByIdResult["user"]) & {
    tweets?: {
        edges: Array<{
            node: any;
        }>;
    };
};

interface UserProfileProps {
    user: UserData | null;
    loading: boolean;
    error: string | null;
    isOwnProfile: boolean;
    onRefresh?: () => void;
}

export function UserProfile({
    user,
    loading,
    error,
    isOwnProfile,
    onRefresh,
}: UserProfileProps) {
    const { ready, authenticated } = usePrivy();
    const { identityToken } = useIdentityToken();
    const router = useRouter();
    const { followUser, unfollowUser, loading: followLoading } = useFollowUser();
    const [isFollowing, setIsFollowing] = useState(false);

    // Get wallet token balances (only for own profile)
    const mintAddresses = [BLING_MINT, USDC_MINT, STABLECOIN_MINT].filter(Boolean);
    const { balances, loading: loadingBalances } = useWalletTokenBalances(
        isOwnProfile ? mintAddresses : [],
        USDC_MINT,
        STABLECOIN_MINT
    );

    // Get canonical vote costs (only for own profile)
    const { costs: pumpCosts, loading: loadingPumpCosts } = useCanonicalVoteCosts("Pump");
    const { costs: smackCosts, loading: loadingSmackCosts } = useCanonicalVoteCosts("Smack");

    // Update following state when user data changes
    useEffect(() => {
        if (user) {
            setIsFollowing(user.isFollowedByViewer || false);
        }
    }, [user]);

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated && !user) {
        return <LoginPrompt />;
    }

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 3 }}>
                Error: {error}
            </Alert>
        );
    }

    if (!user) {
        return (
            <Alert severity="info" sx={{ m: 3 }}>
                User not found
            </Alert>
        );
    }

    // Get token decimals
    const blingTokenConfig = getTokenConfig(BLING_MINT, BLING_MINT, USDC_MINT, STABLECOIN_MINT);
    const usdcTokenConfig = USDC_MINT ? getTokenConfig(USDC_MINT, BLING_MINT, USDC_MINT, STABLECOIN_MINT) : null;
    const stablecoinTokenConfig = STABLECOIN_MINT ? getTokenConfig(STABLECOIN_MINT, BLING_MINT, USDC_MINT, STABLECOIN_MINT) : null;

    const blingDecimals = blingTokenConfig?.metadata.decimals ?? 9;
    const usdcDecimals = usdcTokenConfig?.metadata.decimals ?? 6;
    const stablecoinDecimals = stablecoinTokenConfig?.metadata.decimals ?? 6;

    const handleFollow = async () => {
        if (!user.id) return;
        const success = await followUser(user.id);
        if (success) {
            setIsFollowing(true);
            onRefresh?.();
        }
    };

    const handleUnfollow = async () => {
        if (!user.id) return;
        const success = await unfollowUser(user.id);
        if (success) {
            setIsFollowing(false);
            onRefresh?.();
        }
    };

    const handleEditProfile = () => {
        router.push("/settings");
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {/* Profile Header */}
                <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                    <Card>
                        <CardContent>
                            <Stack spacing={3}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                    <Avatar
                                        src={user.profile?.avatarUrl || undefined}
                                        sx={{
                                            width: 100,
                                            height: 100,
                                            bgcolor: "primary.main",
                                            fontSize: "2.5rem",
                                        }}
                                    >
                                        {user.profile?.displayName
                                            ?.charAt(0)
                                            .toUpperCase() || "U"}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                            {user.profile?.displayName || "User"}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                                            @{user.profile?.handle || "unknown"}
                                        </Typography>
                                        {user.profile?.bio && (
                                            <Typography variant="body2" color="text.secondary">
                                                {user.profile.bio}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* Follow/Edit Button */}
                                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                    {isOwnProfile ? (
                                        <Button
                                            variant="contained"
                                            startIcon={<EditIcon />}
                                            onClick={handleEditProfile}
                                        >
                                            Edit Profile
                                        </Button>
                                    ) : (
                                        <Button
                                            variant={isFollowing ? "outlined" : "contained"}
                                            startIcon={isFollowing ? <PersonRemoveIcon /> : <PersonAddIcon />}
                                            onClick={isFollowing ? handleUnfollow : handleFollow}
                                            disabled={followLoading}
                                        >
                                            {followLoading ? (
                                                <CircularProgress size={16} />
                                            ) : isFollowing ? (
                                                "Unfollow"
                                            ) : (
                                                "Follow"
                                            )}
                                        </Button>
                                    )}

                                    {/* Follower/Following Stats */}
                                    <Box sx={{ display: "flex", gap: 2, ml: "auto" }}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                        >
                                            <strong>{user.followersCount || 0}</strong> Followers
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                        >
                                            <strong>{user.followingCount || 0}</strong> Following
                                        </Typography>
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
                                    {user.hasOnchainAccount ? (
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
                                        {formatSocialScore(user.socialScore)}
                                    </Typography>
                                </Box>

                                {/* Vault Balances - Only show for own profile */}
                                {isOwnProfile && (
                                    <>
                                        <Divider />
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                Vault Balances:
                                            </Typography>
                                            <Stack spacing={1} sx={{ mt: 1 }}>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <TokenDisplay
                                                        mint={BLING_MINT}
                                                        blingMint={BLING_MINT}
                                                        usdcMint={USDC_MINT}
                                                        stablecoinMint={STABLECOIN_MINT}
                                                        size="small"
                                                    />
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                        {user.vaultBalances?.bling !== null && user.vaultBalances?.bling !== undefined
                                                            ? formatTokenBalance(user.vaultBalances.bling, blingDecimals)
                                                            : user.vaultBalance !== null
                                                                ? formatTokenBalance(user.vaultBalance, blingDecimals)
                                                                : "N/A"}
                                                    </Typography>
                                                </Box>
                                                {USDC_MINT && user.vaultBalances?.usdc !== null && (
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <TokenDisplay
                                                            mint={USDC_MINT}
                                                            blingMint={BLING_MINT}
                                                            usdcMint={USDC_MINT}
                                                            stablecoinMint={STABLECOIN_MINT}
                                                            size="small"
                                                        />
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {formatTokenBalance(user.vaultBalances.usdc, usdcDecimals)}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {STABLECOIN_MINT && user.vaultBalances?.stablecoin !== null && (
                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <TokenDisplay
                                                            mint={STABLECOIN_MINT}
                                                            blingMint={BLING_MINT}
                                                            usdcMint={USDC_MINT}
                                                            stablecoinMint={STABLECOIN_MINT}
                                                            size="small"
                                                        />
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {formatTokenBalance(user.vaultBalances.stablecoin, stablecoinDecimals)}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Box>

                {/* Wallet Info - Only show for own profile */}
                {isOwnProfile && (
                    <>
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
                                                {user.wallet}
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
                                                    BLING_MINT,
                                                    USDC_MINT,
                                                    STABLECOIN_MINT
                                                );

                                                if (!balance) return null;

                                                return (
                                                    <Box key={mint}>
                                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <TokenDisplay
                                                                mint={mint}
                                                                blingMint={BLING_MINT}
                                                                usdcMint={USDC_MINT}
                                                                stablecoinMint={STABLECOIN_MINT}
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
                                        </Stack>
                                    )}
                                </CardContent>
                            </Card>
                        </Box>
                    </>
                )}
            </Box>

            {/* Tweets Timeline */}
            <Box sx={{ mt: 3 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Tweets
                        </Typography>
                        {user.tweets && user.tweets.edges && user.tweets.edges.length > 0 ? (
                            <Stack spacing={2}>
                                {user.tweets.edges.map((edge) => (
                                    <TweetCard
                                        key={edge.node.id}
                                        tweet={edge.node}
                                        clickable={true}
                                    />
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                                No tweets yet
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}

