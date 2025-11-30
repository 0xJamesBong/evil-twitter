"use client";

import { useState, useEffect } from "react";
import { Button, Stack, Typography, CircularProgress } from "@mui/material";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { useTweetStore } from "../../lib/stores/tweetStore";
import { TweetNode } from "../../lib/graphql/tweets/types";

interface VoteButtonsProps {
    tweet: TweetNode;
}

export function VoteButtons({ tweet: tweetProp }: VoteButtonsProps) {
    const [loading, setLoading] = useState(false);
    const [userUpvotes, setUserUpvotes] = useState(0);
    const [userDownvotes, setUserDownvotes] = useState(0);
    const [optimisticGlobalUpvotes, setOptimisticGlobalUpvotes] = useState<number | null>(null);
    const [optimisticGlobalDownvotes, setOptimisticGlobalDownvotes] = useState<number | null>(null);
    const { identityToken } = useIdentityToken();
    const { voteOnTweet, tweets } = useTweetStore();
    const { enqueueSnackbar } = useSnackbar();

    // Get the latest tweet from store if available, otherwise use prop
    const tweet = tweets.find((t) => t.id === tweetProp.id) || tweetProp;

    const postState = tweet.postState;
    const globalUpvotes = optimisticGlobalUpvotes !== null ? optimisticGlobalUpvotes : (postState?.upvotes || 0);
    const globalDownvotes = optimisticGlobalDownvotes !== null ? optimisticGlobalDownvotes : (postState?.downvotes || 0);
    const isOpen = postState?.state === "Open";

    // Initialize user vote counts from localStorage (persist across page reloads)
    useEffect(() => {
        if (tweet.id) {
            const key = `userVotes_${tweet.id}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    const { upvotes, downvotes } = JSON.parse(saved);
                    setUserUpvotes(upvotes || 0);
                    setUserDownvotes(downvotes || 0);
                } catch (e) {
                    // Invalid data, ignore
                }
            }
        }
    }, [tweet.id]);

    // Reset optimistic global counts when postState updates from backend
    useEffect(() => {
        if (postState) {
            setOptimisticGlobalUpvotes(null);
            setOptimisticGlobalDownvotes(null);
        }
    }, [postState?.upvotes, postState?.downvotes]);

    const handleVote = async (side: "pump" | "smack") => {
        if (!tweet.id) return;

        // Validate post state
        if (!isOpen) {
            enqueueSnackbar("This post is no longer open for voting", { variant: "error" });
            return;
        }

        setLoading(true);
        try {
            if (!identityToken) {
                enqueueSnackbar("Please log in to vote", { variant: "error" });
                return;
            }

            // Optimistically update user vote counts and global counts
            if (side === "pump") {
                setUserUpvotes((prev) => prev + 1);
                setOptimisticGlobalUpvotes((prev) => (prev !== null ? prev + 1 : globalUpvotes + 1));
            } else {
                setUserDownvotes((prev) => prev + 1);
                setOptimisticGlobalDownvotes((prev) => (prev !== null ? prev + 1 : globalDownvotes + 1));
            }

            // Save to localStorage
            const key = `userVotes_${tweet.id}`;
            localStorage.setItem(
                key,
                JSON.stringify({
                    upvotes: side === "pump" ? userUpvotes + 1 : userUpvotes,
                    downvotes: side === "smack" ? userDownvotes + 1 : userDownvotes,
                })
            );

            await voteOnTweet(identityToken, tweet.id, side);

            enqueueSnackbar(`Successfully voted ${side}!`, { variant: "success" });
        } catch (error) {
            console.error("Failed to vote:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to vote";

            // Revert optimistic update on error
            if (side === "pump") {
                setUserUpvotes((prev) => Math.max(0, prev - 1));
                setOptimisticGlobalUpvotes((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
            } else {
                setUserDownvotes((prev) => Math.max(0, prev - 1));
                setOptimisticGlobalDownvotes((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
            }

            // Show user-friendly error messages
            if (errorMessage.includes("Insufficient")) {
                enqueueSnackbar("Insufficient vault balance. Please deposit more tokens.", { variant: "error" });
            } else if (errorMessage.includes("expired") || errorMessage.includes("Expired")) {
                enqueueSnackbar("This post has expired and can no longer be voted on", { variant: "error" });
            } else if (errorMessage.includes("settled") || errorMessage.includes("Settled")) {
                enqueueSnackbar("This post has already been settled", { variant: "error" });
            } else if (errorMessage.includes("not open") || errorMessage.includes("Not open")) {
                enqueueSnackbar("This post is not open for voting", { variant: "error" });
            } else {
                enqueueSnackbar(errorMessage, { variant: "error" });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!tweet.postIdHash) {
        // Not an original tweet, no voting
        return null;
    }

    return (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleVote("pump")}
                    disabled={loading || !isOpen}
                    sx={{
                        borderRadius: 1,
                        px: 2,
                        py: 1,
                        "&:disabled": {
                            opacity: 0.5,
                        },
                    }}
                >
                    <Stack direction="column" spacing={0} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Pump
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem", opacity: 0.9 }}>
                            You: {userUpvotes} | Total: {globalUpvotes.toLocaleString()}
                        </Typography>
                    </Stack>
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleVote("smack")}
                    disabled={loading || !isOpen}
                    sx={{
                        borderRadius: 1,
                        px: 2,
                        py: 1,
                        "&:disabled": {
                            opacity: 0.5,
                        },
                    }}
                >
                    <Stack direction="column" spacing={0} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Smack
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem", opacity: 0.9 }}>
                            You: {userDownvotes} | Total: {globalDownvotes.toLocaleString()}
                        </Typography>
                    </Stack>
                </Button>
            </Stack>
            {postState && (
                <Typography variant="body2" color="text.secondary">
                    {postState.state === "Settled" && postState.winningSide
                        ? `Winner: ${postState.winningSide}`
                        : postState.state}
                </Typography>
            )}
            {loading && <CircularProgress size={20} />}
        </Stack>
    );
}

