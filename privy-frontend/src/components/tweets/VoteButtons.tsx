"use client";

import { useState } from "react";
import { Box, Button, TextField, Stack, Typography, CircularProgress } from "@mui/material";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { useTweetStore } from "../../lib/stores/tweetStore";
import { TweetNode } from "../../lib/graphql/tweets/types";

interface VoteButtonsProps {
    tweet: TweetNode;
}

export function VoteButtons({ tweet }: VoteButtonsProps) {
    const [votes, setVotes] = useState(1);
    const [loading, setLoading] = useState(false);
    const { identityToken } = useIdentityToken();
    const { voteOnTweet } = useTweetStore();
    const { enqueueSnackbar } = useSnackbar();

    const handleVote = async (side: "pump" | "smack") => {
        if (!tweet.id) return;

        // Validate post state
        if (!isOpen) {
            enqueueSnackbar("This post is no longer open for voting", { variant: "error" });
            return;
        }

        if (votes <= 0) {
            enqueueSnackbar("Please enter a valid vote amount", { variant: "error" });
            return;
        }

        setLoading(true);
        try {
            if (!identityToken) {
                enqueueSnackbar("Please log in to vote", { variant: "error" });
                return;
            }
            await voteOnTweet(identityToken, tweet.id, side, votes);
            enqueueSnackbar(`Successfully voted ${side}!`, { variant: "success" });
            // Reset votes input after successful vote
            setVotes(1);
        } catch (error) {
            console.error("Failed to vote:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to vote";

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

    const postState = tweet.postState;
    const upvotes = postState?.upvotes || 0;
    const downvotes = postState?.downvotes || 0;
    const isOpen = postState?.state === "Open";

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
                    Pump {upvotes}
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
                    Smack {downvotes}
                </Button>
            </Stack>
            {isOpen && (
                <TextField
                    type="number"
                    inputProps={{ min: 1 }}
                    value={votes}
                    onChange={(e) => setVotes(parseInt(e.target.value) || 1)}
                    disabled={loading}
                    size="small"
                    sx={{
                        width: 80,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 1,
                        },
                    }}
                />
            )}
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

