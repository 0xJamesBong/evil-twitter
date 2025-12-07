"use client";

import { useState, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Stack,
    Chip,
    Button,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ClaimableRewardNode } from "@/lib/graphql/tweets/queries";
import { getTokenConfig } from "@/lib/utils/tokens";
import { formatTokenBalance } from "@/lib/utils/formatting";
import { useSnackbar } from "notistack";
import { useClaimableRewards } from "@/hooks/useClaimableRewards";
import { useClaimPostRewards } from "@/hooks/useClaimPostRewards";
import { TokenLogo } from "@/components/tokens/TokenLogo";

interface RewardGroup {
    postIdHash: string;
    tweetId: string;
    rewards: ClaimableRewardNode[];
    totalAmount: number;
}

export default function RewardsPage() {
    const { enqueueSnackbar } = useSnackbar();
    const { rewards, loading, error, refetch } = useClaimableRewards();
    const [claimingPosts, setClaimingPosts] = useState<Set<string>>(new Set());

    // Group rewards by post
    const groupedRewards = useMemo(() => {
        if (!rewards || rewards.length === 0) return new Map<string, RewardGroup>();

        const groups = new Map<string, RewardGroup>();

        for (const reward of rewards) {
            const key = `${reward.postIdHash}-${reward.tweetId}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    postIdHash: reward.postIdHash,
                    tweetId: reward.tweetId,
                    rewards: [],
                    totalAmount: 0,
                });
            }

            const group = groups.get(key)!;
            group.rewards.push(reward);

            const tokenConfig = getTokenConfig(reward.tokenMint);
            const amount = parseFloat(reward.amount);
            const decimals = tokenConfig?.metadata.decimals || 9;
            const formattedAmount = amount / Math.pow(10, decimals);
            group.totalAmount += formattedAmount;
        }

        return groups;
    }, [rewards]);

    // Component for a post reward group with claim button
    const PostRewardGroup = ({
        group,
        claimingPosts,
        setClaimingPosts,
        refetch,
    }: {
        group: RewardGroup;
        claimingPosts: Set<string>;
        setClaimingPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
        refetch: () => Promise<void>;
    }) => {
        const { claimAllRewards, loading: claimLoading } = useClaimPostRewards(
            group.rewards,
            refetch
        );
        const isClaiming = claimingPosts.has(group.postIdHash);

        const handleClaim = async () => {
            setClaimingPosts((prev) => new Set(prev).add(group.postIdHash));
            try {
                await claimAllRewards();
            } finally {
                setClaimingPosts((prev) => {
                    const next = new Set(prev);
                    next.delete(group.postIdHash);
                    return next;
                });
            }
        };

        return (
            <Accordion key={group.postIdHash} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            Post: {group.postIdHash.slice(0, 8)}...
                        </Typography>
                        <Stack direction="row" alignItems="center" gap={1}>
                            {group.rewards.map((reward) => (
                                <TokenLogo
                                    key={reward.tokenMint}
                                    mint={reward.tokenMint}
                                    size={24}
                                />
                            ))}
                        </Stack>
                        <Chip
                            label={`${group.rewards.length} token${group.rewards.length > 1 ? "s" : ""}`}
                            color="primary"
                            size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                            Total: {group.totalAmount.toFixed(4)}
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        {group.rewards.map((reward) => (
                            <RewardItem
                                key={`${reward.postIdHash}-${reward.tokenMint}`}
                                reward={reward}
                            />
                        ))}
                        <Box sx={{ pt: 1, display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                variant="contained"
                                onClick={handleClaim}
                                disabled={isClaiming || claimLoading}
                                sx={{ minWidth: 150 }}
                            >
                                {isClaiming || claimLoading ? (
                                    <CircularProgress size={20} />
                                ) : (
                                    `Claim All (${group.rewards.length})`
                                )}
                            </Button>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        );
    };

    // Component to display individual token rewards (no claim button)
    const RewardItem = ({ reward }: { reward: ClaimableRewardNode }) => {
        const tokenConfig = getTokenConfig(reward.tokenMint);
        const amount = parseFloat(reward.amount);
        const decimals = tokenConfig?.metadata.decimals || 9;
        const formattedAmount = amount / Math.pow(10, decimals);

        return (
            <Paper sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                    <TokenLogo
                        mint={reward.tokenMint}
                        size={40}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body1" fontWeight="bold">
                                {tokenConfig?.metadata.symbol || "Unknown Token"}
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {formatTokenBalance(formattedAmount, decimals)}{" "}
                            {tokenConfig?.metadata.symbol || ""}
                        </Typography>
                        <Chip
                            label={reward.rewardType}
                            size="small"
                            sx={{ mt: 1 }}
                        />
                    </Box>
                </Stack>
            </Paper>
        );
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "400px",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error">
                    Error loading rewards: {error}
                </Typography>
            </Box>
        );
    }

    const rewardsArray = Array.from(groupedRewards.values());

    if (rewardsArray.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    No Pending Rewards
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    You don't have any rewards available to claim at the moment.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
                Pending Rewards
            </Typography>

            <Stack spacing={2}>
                {rewardsArray.map((group) => (
                    <PostRewardGroup
                        key={group.postIdHash}
                        group={group}
                        claimingPosts={claimingPosts}
                        setClaimingPosts={setClaimingPosts}
                        refetch={refetch}
                    />
                ))}
            </Stack>
        </Box>
    );
}

