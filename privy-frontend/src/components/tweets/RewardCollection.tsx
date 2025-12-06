"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Button,
    Typography,
    Chip,
    CircularProgress,
    Stack,
    keyframes,
} from "@mui/material";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { getTokenConfig } from "@/lib/utils/tokens";
import { formatTokenBalance } from "@/lib/utils/formatting";
import { useClaimReward } from "@/hooks/useClaimReward";

interface RewardCollectionProps {
    tweet: TweetNode;
    currentUserId?: string;
}

// Animation keyframes
const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const confetti = keyframes`
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
`;

export function RewardCollection({ tweet, currentUserId }: RewardCollectionProps) {
    const [showConfetti, setShowConfetti] = useState(false);

    // Default to BLING token
    const tokenMint = process.env.NEXT_PUBLIC_BLING_MINT || "";
    const tokenConfig = getTokenConfig(tokenMint);

    const { claimReward, loading, claimed } = useClaimReward({
        tweetId: tweet.id || "",
        tokenMint,
    });

    const postState = tweet.postState;
    const isSettled = postState?.state === "Settled";
    const payoutInfo = postState?.payoutInfo;
    const isFrozen = payoutInfo?.frozen ?? false;
    const winningSide = postState?.winningSide;
    const userVotes = postState?.userVotes;

    // Check if user is creator
    const isCreator = currentUserId && tweet.ownerId === currentUserId;

    // Check if user has winning votes
    const hasWinningVotes =
        winningSide === "Pump" && (userVotes?.upvotes ?? 0) > 0
            ? true
            : winningSide === "Smack" && (userVotes?.downvotes ?? 0) > 0
                ? true
                : false;

    // Calculate claimable amounts
    const creatorFee = payoutInfo?.creatorFee ? parseFloat(payoutInfo.creatorFee) : 0;
    const userVoteReward = hasWinningVotes
        ? payoutInfo?.totalPayout
            ? parseFloat(payoutInfo.totalPayout) * 0.1 // Rough estimate - actual calculation is on-chain
            : 0
        : 0;

    const totalClaimable = (isCreator ? creatorFee : 0) + (hasWinningVotes ? userVoteReward : 0);
    const canClaim = isSettled && isFrozen && totalClaimable > 0 && (isCreator || hasWinningVotes);

    const handleClaim = async () => {
        if (!canClaim) {
            return;
        }

        await claimReward();
        if (claimed) {
            setShowConfetti(true);
            // Hide confetti after animation
            setTimeout(() => setShowConfetti(false), 3000);
        }
    };

    // Show confetti when claimed state changes
    useEffect(() => {
        if (claimed) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    }, [claimed]);

    if (!isSettled || !canClaim) {
        return null;
    }

    return (
        <Box
            sx={{
                position: "relative",
                mt: 2,
                p: 2,
                borderRadius: 2,
                background: claimed
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                backgroundSize: claimed ? "100% 100%" : "200% 200%",
                animation: claimed
                    ? undefined
                    : `${shimmer} 3s linear infinite, ${pulse} 2s ease-in-out infinite`,
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
        >
            {/* Confetti effect */}
            {showConfetti && (
                <Box
                    sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: "none",
                        overflow: "hidden",
                    }}
                >
                    {[...Array(20)].map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: "absolute",
                                left: `${(i * 5) % 100}%`,
                                top: "50%",
                                width: 8,
                                height: 8,
                                backgroundColor: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3"][
                                    i % 4
                                ],
                                borderRadius: "50%",
                                animation: `${confetti} 1s ease-out forwards`,
                                animationDelay: `${i * 0.1}s`,
                            }}
                        />
                    ))}
                </Box>
            )}

            <Stack spacing={1.5}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            color: "white",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        💰
                        {claimed
                            ? "Claimed ✓"
                            : tokenConfig
                                ? `${formatTokenBalance(totalClaimable, tokenConfig.metadata.decimals)} ${tokenConfig.metadata.symbol} available`
                                : `${totalClaimable.toLocaleString()} available`}
                    </Typography>
                    {!claimed && (
                        <Chip
                            label="Rewards Ready"
                            size="small"
                            sx={{
                                backgroundColor: "rgba(255, 255, 255, 0.3)",
                                color: "white",
                                fontWeight: "bold",
                            }}
                        />
                    )}
                </Box>

                {!claimed && (
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleClaim}
                        disabled={loading || !canClaim}
                        sx={{
                            backgroundColor: "white",
                            color: "#f5576c",
                            fontWeight: "bold",
                            py: 1.5,
                            "&:hover": {
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                transform: "scale(1.02)",
                            },
                            "&:disabled": {
                                backgroundColor: "rgba(255, 255, 255, 0.5)",
                            },
                            transition: "all 0.2s ease-in-out",
                        }}
                    >
                        {loading ? (
                            <CircularProgress size={24} sx={{ color: "#f5576c" }} />
                        ) : (
                            "Claim Rewards"
                        )}
                    </Button>
                )}

                {claimed && (
                    <Typography variant="body2" sx={{ color: "white", opacity: 0.9 }}>
                        Your rewards have been sent to your vault!
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

