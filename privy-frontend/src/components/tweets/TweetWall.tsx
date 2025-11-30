"use client";

import { useState, useEffect } from "react";
import { Box, TextField, Button, Stack, Paper, CircularProgress } from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { TweetCard } from "./TweetCard";
import { ReplyModal } from "./ReplyModal";
import { QuoteModal } from "./QuoteModal";
import { RetweetModal } from "./RetweetModal";
import { useTweetStore } from "@/lib/stores/tweetStore";
import { TweetNode } from "@/lib/graphql/tweets/types";

export function TweetWall() {
    const { enqueueSnackbar } = useSnackbar();
    const { identityToken } = useIdentityToken();
    const {
        tweets,
        isLoading,
        isCreating,
        error,
        createTweet,
        replyTweet,
        quoteTweet,
        retweetTweet,
        likeTweet,
        fetchTimeline,
        showReplyModal,
        showQuoteModal,
        replyTweetId,
        quoteTweetId,
        replyContent,
        quoteContent,
        openReplyModal,
        closeReplyModal,
        setReplyContent,
        clearReplyData,
        openQuoteModal,
        closeQuoteModal,
        setQuoteContent,
        clearQuoteData,
    } = useTweetStore();
    const [newTweetContent, setNewTweetContent] = useState("");

    // Fetch timeline on mount (works for both authenticated and unauthenticated users)
    useEffect(() => {
        fetchTimeline(identityToken || undefined).catch((e) => {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to load timeline",
                { variant: "error" }
            );
        });
    }, [identityToken, fetchTimeline, enqueueSnackbar]);

    const handleReply = (tweet: TweetNode) => {
        openReplyModal(tweet.id || "");
    };

    const handleQuote = (tweet: TweetNode) => {
        openQuoteModal(tweet.id || "");
    };

    const handleRetweet = async (tweet: TweetNode) => {
        if (!identityToken) {
            enqueueSnackbar("Please log in to retweet", { variant: "error" });
            return;
        }
        if (!tweet.id) return;

        try {
            await retweetTweet(identityToken, tweet.id);
            enqueueSnackbar("Retweeted!", { variant: "success" });
        } catch (e) {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to retweet",
                { variant: "error" }
            );
        }
    };

    const handleLike = async (tweet: TweetNode) => {
        if (!identityToken) {
            enqueueSnackbar("Please log in to like", { variant: "error" });
            return;
        }
        if (!tweet.id) return;

        try {
            await likeTweet(identityToken, tweet.id);
        } catch (e) {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to like tweet",
                { variant: "error" }
            );
        }
    };

    const handleSubmitReply = async () => {
        if (!identityToken || !replyTweetId || !replyContent.trim()) return;

        try {
            await replyTweet(identityToken, replyContent.trim(), replyTweetId);
            clearReplyData();
            enqueueSnackbar("Reply posted!", { variant: "success" });
        } catch (e) {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to post reply",
                { variant: "error" }
            );
        }
    };

    const handleSubmitQuote = async () => {
        if (!identityToken || !quoteTweetId || !quoteContent.trim()) return;

        try {
            await quoteTweet(identityToken, quoteContent.trim(), quoteTweetId);
            clearQuoteData();
            enqueueSnackbar("Quote tweet posted!", { variant: "success" });
        } catch (e) {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to post quote",
                { variant: "error" }
            );
        }
    };

    const handlePostTweet = async () => {
        if (!newTweetContent.trim()) return;
        if (!identityToken) {
            enqueueSnackbar("Please log in to post a tweet", { variant: "error" });
            return;
        }

        try {
            const result = await createTweet(identityToken!, newTweetContent.trim());
            setNewTweetContent("");
            
            // Show toast with transaction ID if post was created on-chain
            if (result.onchainSignature) {
                enqueueSnackbar(
                    `Tweet posted! Transaction: ${result.onchainSignature.slice(0, 8)}...`,
                    { variant: "success" }
                );
            } else {
                enqueueSnackbar("Tweet posted!", { variant: "success" });
            }
        } catch (e) {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to post tweet",
                { variant: "error" }
            );
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
            {/* Compose Tweet - Only show if authenticated */}
            {identityToken && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderBottom: 1,
                        borderColor: "grey.200",
                    }}
                >
                    <Stack spacing={2}>
                        <TextField
                            placeholder="What's happening?"
                            multiline
                            rows={3}
                            value={newTweetContent}
                            onChange={(e) => setNewTweetContent(e.target.value)}
                            variant="outlined"
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    "& fieldset": {
                                        border: "none",
                                    },
                                },
                            }}
                        />
                        <Stack direction="row" justifyContent="flex-end">
                            <Button
                                variant="contained"
                                onClick={handlePostTweet}
                                disabled={!newTweetContent.trim() || isCreating}
                                startIcon={isCreating ? <CircularProgress size={16} /> : <SendIcon />}
                                sx={{
                                    borderRadius: "9999px",
                                    px: 3,
                                }}
                            >
                                {isCreating ? "Posting..." : "Tweet"}
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            )}

            {/* Tweet Feed */}
            <Box>
                {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : tweets.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                        No tweets yet. Be the first to tweet!
                    </Box>
                ) : (
                    tweets.map((tweet) => (
                        <TweetCard
                            key={tweet.id}
                            tweet={tweet}
                            onReply={handleReply}
                            onQuote={handleQuote}
                            onRetweet={handleRetweet}
                            onLike={handleLike}
                        />
                    ))
                )}
            </Box>

            {/* Modals */}
            <ReplyModal
                open={showReplyModal}
                onClose={closeReplyModal}
                tweet={replyTweetId ? tweets.find((t) => t.id === replyTweetId) || null : null}
                content={replyContent}
                onContentChange={setReplyContent}
                onSubmit={handleSubmitReply}
                isSubmitting={isCreating}
            />
            <QuoteModal
                open={showQuoteModal}
                onClose={closeQuoteModal}
                tweet={quoteTweetId ? tweets.find((t) => t.id === quoteTweetId) || null : null}
                content={quoteContent}
                onContentChange={setQuoteContent}
                onSubmit={handleSubmitQuote}
                isSubmitting={isCreating}
            />
        </Box>
    );
}

