"use client";

import { useState, useEffect } from "react";
import { Box, TextField, Button, Stack, Paper, CircularProgress, Tabs, Tab } from "@mui/material";
import { Send as SendIcon, HelpOutline as QuestionIcon } from "@mui/icons-material";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { TweetCard } from "./TweetCard";
import { ReplyModal } from "./ReplyModal";
import { QuoteModal } from "./QuoteModal";
import { AnswerModal } from "./AnswerModal";
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
        questionTweet,
        answerTweet,
        retweetTweet,
        likeTweet,
        fetchTimeline,
        showReplyModal,
        showQuoteModal,
        showAnswerModal,
        replyTweetId,
        quoteTweetId,
        answerQuestionId,
        replyContent,
        quoteContent,
        answerContent,
        openReplyModal,
        closeReplyModal,
        setReplyContent,
        clearReplyData,
        openQuoteModal,
        closeQuoteModal,
        setQuoteContent,
        clearQuoteData,
        openAnswerModal,
        closeAnswerModal,
        setAnswerContent,
        clearAnswerData,
    } = useTweetStore();
    const [newTweetContent, setNewTweetContent] = useState("");
    const [questionContent, setQuestionContent] = useState("");
    const [activeTab, setActiveTab] = useState<"tweet" | "question">("tweet");

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

    const handleAnswer = (tweet: TweetNode) => {
        openAnswerModal(tweet.id || "");
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
            const result = await quoteTweet(identityToken, quoteContent.trim(), quoteTweetId);
            clearQuoteData();

            // Show toast with transaction ID if post was created on-chain
            if (result.onchainSignature) {
                enqueueSnackbar(
                    `Quote tweet posted! Transaction: ${result.onchainSignature.slice(0, 8)}...`,
                    { variant: "success" }
                );
            } else {
                enqueueSnackbar("Quote tweet posted!", { variant: "success" });
            }
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

    const handlePostQuestion = async () => {
        console.log("handlePostQuestion called", { questionContent, identityToken: !!identityToken });
        if (!questionContent.trim()) {
            console.log("Question content is empty");
            return;
        }
        if (!identityToken) {
            enqueueSnackbar("Please log in to ask a question", { variant: "error" });
            return;
        }

        try {
            console.log("Calling questionTweet mutation...");
            const result = await questionTweet(identityToken!, questionContent.trim());
            console.log("Question tweet result:", result);
            setQuestionContent("");

            // Show toast with transaction ID if post was created on-chain
            if (result.onchainSignature) {
                enqueueSnackbar(
                    `Question posted! Transaction: ${result.onchainSignature.slice(0, 8)}...`,
                    { variant: "success" }
                );
            } else {
                enqueueSnackbar("Question posted!", { variant: "success" });
            }
        } catch (e) {
            console.error("Error posting question:", e);
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to post question",
                { variant: "error" }
            );
        }
    };

    const handleSubmitAnswer = async () => {
        if (!identityToken || !answerQuestionId || !answerContent.trim()) return;

        try {
            const result = await answerTweet(identityToken, answerContent.trim(), answerQuestionId);
            clearAnswerData();

            // Show toast with transaction ID if post was created on-chain
            if (result.onchainSignature) {
                enqueueSnackbar(
                    `Answer posted! Transaction: ${result.onchainSignature.slice(0, 8)}...`,
                    { variant: "success" }
                );
            } else {
                enqueueSnackbar("Answer posted!", { variant: "success" });
            }
        } catch (e) {
            enqueueSnackbar(
                e instanceof Error ? e.message : "Failed to post answer",
                { variant: "error" }
            );
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
            {/* Compose Tweet/Question - Only show if authenticated */}
            {identityToken && (
                <Paper
                    elevation={0}
                    sx={{
                        borderBottom: 1,
                        borderColor: "rgba(255,255,255,0.06)",
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        sx={{
                            borderBottom: 1,
                            borderColor: "rgba(255,255,255,0.06)",
                        }}
                    >
                        <Tab label="Tweet" value="tweet" />
                        <Tab
                            label="Ask Question"
                            value="question"
                            icon={<QuestionIcon />}
                            iconPosition="start"
                        />
                    </Tabs>

                    {activeTab === "tweet" && (
                        <Box sx={{ p: 2 }}>
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
                        </Box>
                    )}

                    {activeTab === "question" && (
                        <Box sx={{ p: 2 }}>
                            <Stack spacing={2}>
                                <TextField
                                    placeholder="What would you like to know?"
                                    multiline
                                    rows={3}
                                    value={questionContent}
                                    onChange={(e) => setQuestionContent(e.target.value)}
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
                                        onClick={handlePostQuestion}
                                        disabled={!questionContent.trim() || isCreating}
                                        startIcon={isCreating ? <CircularProgress size={16} /> : <QuestionIcon />}
                                        sx={{
                                            borderRadius: "9999px",
                                            px: 3,
                                        }}
                                    >
                                        {isCreating ? "Posting..." : "Ask Question"}
                                    </Button>
                                </Stack>
                            </Stack>
                        </Box>
                    )}
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
                            onAnswer={handleAnswer}
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
            <AnswerModal
                open={showAnswerModal}
                onClose={closeAnswerModal}
                question={answerQuestionId ? tweets.find((t) => t.id === answerQuestionId) || null : null}
                content={answerContent}
                onContentChange={setAnswerContent}
                onSubmit={handleSubmitAnswer}
                isSubmitting={isCreating}
            />
        </Box>
    );
}

