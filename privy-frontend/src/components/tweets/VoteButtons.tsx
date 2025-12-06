"use client";

import { useState } from "react";
import { Button, Stack, Typography, Box, Chip, Tooltip } from "@mui/material";
import "@/theme/types"; // Import type declarations
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { useTweetStore } from "../../lib/stores/tweetStore";
import { TweetNode } from "../../lib/graphql/tweets/types";
import { getTokenConfig, TokenType } from "../../lib/utils/tokens";
import { TokenDisplay } from "../tokens/TokenDisplay";
import { formatTokenBalance } from "../../lib/utils/formatting";

interface VoteButtonsProps {
    tweet: TweetNode;
}

export function VoteButtons({ tweet: tweetProp }: VoteButtonsProps) {
    const [pumpAnimation, setPumpAnimation] = useState(false);
    const [smackAnimation, setSmackAnimation] = useState(false);
    const { identityToken } = useIdentityToken();
    const { voteOnTweet, tweets } = useTweetStore();
    const { enqueueSnackbar } = useSnackbar();

    // Get the latest tweet from store if available, otherwise use prop
    const tweet = tweets.find((t) => t.id === tweetProp.id) || tweetProp;

    const postState = tweet.postState;
    const globalUpvotes = postState?.upvotes || 0;
    const globalDownvotes = postState?.downvotes || 0;
    const userUpvotes = postState?.userVotes?.upvotes || 0;
    const userDownvotes = postState?.userVotes?.downvotes || 0;
    const isOpen = postState?.state === "Open";

    const handleVote = (side: "pump" | "smack") => {
        if (!tweet.id) return;

        // Validate post state
        if (!isOpen) {
            enqueueSnackbar("This post is no longer open for voting", { variant: "error" });
            return;
        }

        if (!identityToken) {
            enqueueSnackbar("Please log in to vote", { variant: "error" });
            return;
        }

        // Trigger animation immediately (visual feedback only)
        if (side === "pump") {
            setPumpAnimation(true);
            setTimeout(() => setPumpAnimation(false), 600); // Animation duration
        } else {
            setSmackAnimation(true);
            setTimeout(() => setSmackAnimation(false), 600);
        }

        // Show toast notification
        enqueueSnackbar(`Voted ${side === "pump" ? "Pump" : "Smack"}!`, {
            variant: "success",
            autoHideDuration: 2000,
        });

        // Fire-and-forget: send vote to backend (no await, no error handling)
        // Backend will batch and process votes, and frontend will refresh from on-chain
        voteOnTweet(identityToken, tweet.id, side).catch((error) => {
            // Silently log errors - backend handles retries and state sync
            console.error("Vote submission error (will be retried by backend):", error);
        });
    };

    if (!tweet.postIdHash) {
        // Not an original tweet, no voting
        return null;
    }
    console.log("postState", postState);
    return (
        <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ mt: 2 }}
            onClick={(e) => {
                // Stop click event from bubbling to parent (card navigation)
                e.stopPropagation();
            }}
            onMouseDown={(e) => {
                // Also stop mousedown to prevent any drag/selection issues
                e.stopPropagation();
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <Box
                    sx={{
                        position: "relative",
                        display: "inline-block",
                    }}
                >
                    <Tooltip
                        title={
                            <Stack spacing={0.5}>
                                <Typography variant="caption">
                                    {userUpvotes > 0 ? `Your votes: ${userUpvotes}` : "You haven't voted yet"}
                                </Typography>
                                <Typography variant="caption">
                                    Total votes: {globalUpvotes.toLocaleString()}
                                </Typography>
                            </Stack>
                        }
                        arrow
                    >
                        <Button
                            variant={"pump" as any}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVote("pump");
                            }}
                            disabled={!isOpen}
                            sx={{
                                px: 2,
                                py: 1,
                                minWidth: 120,
                                width: 120,
                                position: "relative",
                                overflow: "hidden",
                                transform: pumpAnimation ? "scale(1.1)" : "scale(1)",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: pumpAnimation
                                    ? "0 0 20px rgba(43,227,139,0.6), 0 4px 8px rgba(0, 0, 0, 0.2)"
                                    : undefined,
                                "&:hover": {
                                    transform: "scale(1.05)",
                                },
                                "&:active": {
                                    transform: "scale(0.95)",
                                },
                                "&:disabled": {
                                    opacity: 0.5,
                                    cursor: "not-allowed",
                                },
                            }}
                        >
                            {pumpAnimation && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        width: "100%",
                                        height: "100%",
                                        background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
                                        animation: "bling 0.6s ease-out",
                                        pointerEvents: "none",
                                    }}
                                />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 600, position: "relative", zIndex: 1 }}>
                                Pump
                            </Typography>
                        </Button>
                    </Tooltip>
                </Box>
                <Box
                    sx={{
                        position: "relative",
                        display: "inline-block",
                    }}
                >
                    <Tooltip
                        title={
                            <Stack spacing={0.5}>
                                <Typography variant="caption">
                                    {userDownvotes > 0 ? `Your votes: ${userDownvotes}` : "You haven't voted yet"}
                                </Typography>
                                <Typography variant="caption">
                                    Total votes: {globalDownvotes.toLocaleString()}
                                </Typography>
                            </Stack>
                        }
                        arrow
                    >
                        <Button
                            variant={"smack" as any}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVote("smack");
                            }}
                            disabled={!isOpen}
                            sx={{
                                px: 2,
                                py: 1,
                                minWidth: 120,
                                width: 120,
                                position: "relative",
                                overflow: "hidden",
                                transform: smackAnimation ? "scale(1.1)" : "scale(1)",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: smackAnimation
                                    ? "0 0 20px rgba(255,71,108,0.6), 0 4px 8px rgba(0, 0, 0, 0.2)"
                                    : undefined,
                                "&:hover": {
                                    transform: "scale(1.05)",
                                },
                                "&:active": {
                                    transform: "scale(0.95)",
                                },
                                "&:disabled": {
                                    opacity: 0.5,
                                    cursor: "not-allowed",
                                },
                            }}
                        >
                            {smackAnimation && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        width: "100%",
                                        height: "100%",
                                        background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
                                        animation: "bling 0.6s ease-out",
                                        pointerEvents: "none",
                                    }}
                                />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 600, position: "relative", zIndex: 1 }}>
                                Smack
                            </Typography>
                        </Button>
                    </Tooltip>
                </Box>
            </Stack>
            {postState && (
                <Stack direction="column" spacing={0.5} alignItems="flex-start">
                    <Typography variant="body2" color="text.secondary">
                        {postState.state === "Settled" && postState.winningSide
                            ? `Winner: ${postState.winningSide}`
                            : postState.state}
                    </Typography>
                    {postState.potBalances && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {(() => {
                                const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";
                                const blingConfig = getTokenConfig(BLING_MINT);
                                return (
                                    <Chip
                                        size="small"
                                        label={
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <TokenDisplay
                                                    mint={BLING_MINT}
                                                    showSymbol={true}
                                                    size="small"
                                                />
                                                <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                                    {formatTokenBalance(
                                                        postState.potBalances.bling,
                                                        blingConfig?.metadata.decimals || 9
                                                    )}
                                                </Typography>
                                            </Stack>
                                        }
                                        sx={{ height: "auto", py: 0.5 }}
                                    />
                                );
                            })()}
                            {postState.potBalances.usdc !== null &&
                                postState.potBalances.usdc !== undefined && (
                                    (() => {
                                        const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";
                                        const usdcConfig = getTokenConfig(USDC_MINT);
                                        return (
                                            <Chip
                                                size="small"
                                                label={
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <TokenDisplay
                                                            mint={USDC_MINT}
                                                            showSymbol={true}
                                                            size="small"
                                                        />
                                                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                                            {formatTokenBalance(
                                                                postState.potBalances.usdc,
                                                                usdcConfig?.metadata.decimals || 6
                                                            )}
                                                        </Typography>
                                                    </Stack>
                                                }
                                                sx={{ height: "auto", py: 0.5 }}
                                            />
                                        );
                                    })()
                                )}
                            {postState.potBalances.stablecoin !== null &&
                                postState.potBalances.stablecoin !== undefined && (
                                    (() => {
                                        const STABLECOIN_MINT = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";
                                        const stablecoinConfig = getTokenConfig(STABLECOIN_MINT);
                                        return (
                                            <Chip
                                                size="small"
                                                label={
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <TokenDisplay
                                                            mint={STABLECOIN_MINT}
                                                            showSymbol={true}
                                                            size="small"
                                                        />
                                                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                                            {formatTokenBalance(
                                                                postState.potBalances.stablecoin,
                                                                stablecoinConfig?.metadata.decimals || 6
                                                            )}
                                                        </Typography>
                                                    </Stack>
                                                }
                                                sx={{ height: "auto", py: 0.5 }}
                                            />
                                        );
                                    })()
                                )}
                        </Stack>
                    )}
                </Stack>
            )}
        </Stack>
    );
}

