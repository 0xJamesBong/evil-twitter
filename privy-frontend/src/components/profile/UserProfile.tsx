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
    Dialog,
    DialogTitle,
    DialogContent,
    Tabs,
    Tab,
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
import { FollowList } from "./FollowList";

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
    const [followDialogOpen, setFollowDialogOpen] = useState(false);
    const [followTab, setFollowTab] = useState<"followers" | "following">("followers");

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
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            {/* Banner Section */}
            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    height: 200,
                    bgcolor: "background.paper",
                    backgroundImage: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderBottom: 1,
                    borderColor: "rgba(255,255,255,0.06)",
                }}
            >
                {/* Profile Picture Overlaid on Banner */}
                <Box
                    sx={{
                        position: "absolute",
                        bottom: -60,
                        left: 20,
                    }}
                >
                    <Avatar
                        src={user.profile?.avatarUrl || undefined}
                        sx={{
                            width: 120,
                            height: 120,
                            bgcolor: "primary.main",
                            fontSize: "3rem",
                            border: 4,
                            borderColor: "background.default",
                        }}
                    >
                        {user.profile?.displayName?.charAt(0).toUpperCase() || "U"}
                    </Avatar>
                </Box>
            </Box>

            {/* Profile Content Section */}
            <Box sx={{ pt: 8, px: 3 }}>
                <Card>
                    <CardContent>
                        <Stack spacing={3}>
                            {/* Name, Handle, and Action Buttons */}
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                                <Box sx={{ flex: 1, minWidth: 200 }}>
                                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                                        {user.profile?.displayName || "User"}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                        @{user.profile?.handle || "unknown"}
                                    </Typography>

                                    {/* Bio Section */}
                                    {user.profile?.bio && (
                                        <Typography variant="body1" color="text.primary" sx={{ mb: 2, whiteSpace: "pre-wrap" }}>
                                            {user.profile.bio}
                                        </Typography>
                                    )}

                                    {/* Follower/Following Stats */}
                                    <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                            onClick={() => {
                                                setFollowTab("following");
                                                setFollowDialogOpen(true);
                                            }}
                                        >
                                            <strong style={{ color: "inherit" }}>{user.followingCount || 0}</strong>{" "}
                                            Following
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                                            onClick={() => {
                                                setFollowTab("followers");
                                                setFollowDialogOpen(true);
                                            }}
                                        >
                                            <strong style={{ color: "inherit" }}>{user.followersCount || 0}</strong>{" "}
                                            Followers
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Action Buttons */}
                                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
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

                                    {/* Placeholder for Attack/Apply Weapon/Tool Buttons */}
                                    {!isOwnProfile && (
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            disabled
                                            sx={{ opacity: 0.6 }}
                                        >
                                            Attack
                                        </Button>
                                    )}
                                    {!isOwnProfile && (
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            disabled
                                            sx={{ opacity: 0.6 }}
                                        >
                                            Apply Tool
                                        </Button>
                                    )}
                                </Box>
                            </Box>

                            <Divider />

                            {/* Social Score Display */}
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Social Score:
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                                    {formatSocialScore(user.socialScore)}
                                </Typography>
                            </Box>

                            {/* Account Status */}
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

                            {/* Vault Balances - Only show for own profile */}
                            {isOwnProfile && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                                            Vault Balances:
                                        </Typography>
                                        <Stack spacing={1}>
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

            {/* Tweets Timeline */}
            <Box sx={{ mt: 3, px: 3, pb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                            Tweets
                        </Typography>
                        {user.tweets && user.tweets.edges && user.tweets.edges.length > 0 ? (
                            <Stack spacing={0}>
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

            {/* Followers/Following Dialog */}
            <Dialog
                open={followDialogOpen}
                onClose={() => setFollowDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: "background.paper",
                        height: "600px",
                        maxHeight: "600px",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
            >
                <DialogTitle sx={{ flexShrink: 0, pb: 0, px: 2, pt: 2 }}>
                    <Tabs
                        value={followTab}
                        onChange={(_, newValue) => setFollowTab(newValue)}
                        sx={{ borderBottom: 1, borderColor: "divider", minHeight: 48 }}
                    >
                        <Tab label={`Followers (${user.followersCount || 0})`} value="followers" />
                        <Tab label={`Following (${user.followingCount || 0})`} value="following" />
                    </Tabs>
                </DialogTitle>
                <DialogContent
                    sx={{
                        p: 0,
                        flex: 1,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                    }}
                >
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                            overflowX: "hidden",
                            minHeight: 0,
                        }}
                    >
                        {user.id && (
                            <FollowList
                                userId={user.id}
                                type={followTab}
                                title={followTab === "followers" ? "Followers" : "Following"}
                            />
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}

