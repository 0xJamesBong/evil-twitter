"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Box,
    CircularProgress,
    Typography,
    Divider,
    Button,
    Stack,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";
import { useTweetStore } from "@/lib/stores/tweetStore";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { TweetCard } from "@/components/tweets/TweetCard";
import { ReplyModal } from "@/components/tweets/ReplyModal";
import { QuoteModal } from "@/components/tweets/QuoteModal";

// Group replies by parent ID for hierarchical display
const groupRepliesByParent = (
    replies: TweetNode[]
): Map<string, TweetNode[]> => {
    const map = new Map<string, TweetNode[]>();
    replies.forEach((reply) => {
        const parentId = reply.repliedToTweetId;
        if (!parentId) {
            return;
        }
        const list = map.get(parentId) ?? [];
        list.push(reply);
        map.set(parentId, list);
    });
    map.forEach((list) => {
        list.sort((a, b) => {
            if (a.replyDepth === b.replyDepth) {
                return (
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
            }
            return a.replyDepth - b.replyDepth;
        });
    });
    return map;
};

export default function TweetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { identityToken } = useIdentityToken();
    const { enqueueSnackbar } = useSnackbar();
    const tweetId = params.tweetId as string;

    const {
        fetchTweet,
        fetchThread,
        threads,
        threadLoading,
        threadError,
        isLoading,
        replyTweet,
        quoteTweet,
        retweetTweet,
        likeTweet,
        openReplyModal,
        openQuoteModal,
        closeReplyModal,
        closeQuoteModal,
        showReplyModal,
        showQuoteModal,
        replyTweetId,
        quoteTweetId,
        replyContent,
        quoteContent,
        setReplyContent,
        setQuoteContent,
        clearReplyData,
        clearQuoteData,
        isCreating,
    } = useTweetStore();

    const [tweet, setTweet] = useState<TweetNode | null>(null);
    const [loading, setLoading] = useState(true);

    const thread = tweetId ? threads[tweetId] : undefined;
    const parents = thread?.parents ?? [];
    const replies = thread?.replies ?? [];
    const anchorTweet = thread?.tweet ?? tweet;

    const repliesByParent = useMemo(
        () => groupRepliesByParent(replies),
        [replies]
    );

    const anchorId = anchorTweet?.id ?? tweetId;

    const renderReplies = (
        parentId: string,
        depth: number = 0
    ): React.ReactNode => {
        const children = repliesByParent.get(parentId);
        if (!children || children.length === 0) {
            return null;
        }

        const handleReply = (tweet: TweetNode) => {
            if (!identityToken) {
                enqueueSnackbar("Please log in to reply", { variant: "error" });
                return;
            }
            openReplyModal(tweet.id || "");
        };

        const handleQuote = (tweet: TweetNode) => {
            if (!identityToken) {
                enqueueSnackbar("Please log in to quote", { variant: "error" });
                return;
            }
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
                // Refresh the thread to show the new retweet
                if (tweetId) {
                    await fetchThread(identityToken, tweetId);
                }
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

        return (
            <Box sx={{ pl: depth > 0 ? 4 : 0 }}>
                {children.map((child) => (
                    <Box key={child.id} sx={{ mb: 2 }}>
                        <TweetCard
                            tweet={child}
                            onReply={handleReply}
                            onQuote={handleQuote}
                            onRetweet={handleRetweet}
                            onLike={handleLike}
                        />
                        {renderReplies(child.id || "", depth + 1)}
                    </Box>
                ))}
            </Box>
        );
    };

    const loadTweet = async () => {
        if (!tweetId) return;

        setLoading(true);
        try {
            const tweetData = await fetchTweet(identityToken || undefined, tweetId);
            if (tweetData) {
                setTweet(tweetData);
            }
            await fetchThread(identityToken || undefined, tweetId);
        } catch (error) {
            console.error("Failed to load tweet:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tweetId) {
            loadTweet();
        }
    }, [tweetId, identityToken]);

    if (loading && !anchorTweet) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "50vh",
                    gap: 2,
                }}
            >
                <CircularProgress />
                <Typography color="text.secondary">Loading tweet...</Typography>
            </Box>
        );
    }

    if (!tweetId || (!anchorTweet && !tweet)) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "50vh",
                    gap: 2,
                }}
            >
                <Typography variant="h6" color="text.secondary">
                    Tweet not found
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.back()}
                >
                    Go Back
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 600, mx: "auto" }}>
            {/* Back Button */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "grey.200" }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.back()}
                    sx={{ textTransform: "none" }}
                >
                    Back
                </Button>
            </Box>

            {/* Parents Chain */}
            {parents.length > 0 && (
                <Box>
                    {parents.map((parent) => (
                        <Box key={parent.id} sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                            <TweetCard
                                tweet={parent}
                                onReply={(tweet) => {
                                    if (!identityToken) {
                                        enqueueSnackbar("Please log in to reply", { variant: "error" });
                                        return;
                                    }
                                    openReplyModal(tweet.id || "");
                                }}
                                onQuote={(tweet) => {
                                    if (!identityToken) {
                                        enqueueSnackbar("Please log in to quote", { variant: "error" });
                                        return;
                                    }
                                    openQuoteModal(tweet.id || "");
                                }}
                                onRetweet={async (tweet) => {
                                    if (!identityToken || !tweet.id) return;
                                    try {
                                        await retweetTweet(identityToken, tweet.id);
                                        enqueueSnackbar("Retweeted!", { variant: "success" });
                                        if (tweetId) await fetchThread(identityToken, tweetId);
                                    } catch (e) {
                                        enqueueSnackbar(
                                            e instanceof Error ? e.message : "Failed to retweet",
                                            { variant: "error" }
                                        );
                                    }
                                }}
                                onLike={async (tweet) => {
                                    if (!identityToken || !tweet.id) return;
                                    try {
                                        await likeTweet(identityToken, tweet.id);
                                    } catch (e) {
                                        enqueueSnackbar(
                                            e instanceof Error ? e.message : "Failed to like",
                                            { variant: "error" }
                                        );
                                    }
                                }}
                                clickable={true}
                            />
                        </Box>
                    ))}
                    <Divider />
                </Box>
            )}

            {/* Anchor Tweet */}
            {anchorTweet && (
                <Box sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                    <TweetCard
                        tweet={anchorTweet}
                        onReply={(tweet) => {
                            if (!identityToken) {
                                enqueueSnackbar("Please log in to reply", { variant: "error" });
                                return;
                            }
                            openReplyModal(tweet.id || "");
                        }}
                        onQuote={(tweet) => {
                            if (!identityToken) {
                                enqueueSnackbar("Please log in to quote", { variant: "error" });
                                return;
                            }
                            openQuoteModal(tweet.id || "");
                        }}
                        onRetweet={async (tweet) => {
                            if (!identityToken || !tweet.id) return;
                            try {
                                await retweetTweet(identityToken, tweet.id);
                                enqueueSnackbar("Retweeted!", { variant: "success" });
                                if (tweetId) await fetchThread(identityToken, tweetId);
                            } catch (e) {
                                enqueueSnackbar(
                                    e instanceof Error ? e.message : "Failed to retweet",
                                    { variant: "error" }
                                );
                            }
                        }}
                        onLike={async (tweet) => {
                            if (!identityToken || !tweet.id) return;
                            try {
                                await likeTweet(identityToken, tweet.id);
                            } catch (e) {
                                enqueueSnackbar(
                                    e instanceof Error ? e.message : "Failed to like",
                                    { variant: "error" }
                                );
                            }
                        }}
                        clickable={true}
                    />
                </Box>
            )}

            {/* Replies Section */}
            <Box sx={{ p: 2 }}>
                {threadLoading && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            py: 2,
                        }}
                    >
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">
                            Loading replies...
                        </Typography>
                    </Box>
                )}

                {threadError && (
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "error.50",
                            border: 1,
                            borderColor: "error.main",
                            mb: 2,
                        }}
                    >
                        <Typography color="error">{threadError}</Typography>
                    </Box>
                )}

                {!threadLoading && replies.length > 0 && (
                    <>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                        </Typography>
                        <Box>{renderReplies(anchorId)}</Box>
                    </>
                )}

                {!threadLoading && replies.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                        No replies yet. Be the first to reply!
                    </Typography>
                )}
            </Box>

            {/* Modals */}
            <ReplyModal
                open={showReplyModal}
                onClose={closeReplyModal}
                tweet={
                    replyTweetId
                        ? [
                            ...(anchorTweet ? [anchorTweet] : []),
                            ...parents,
                            ...replies,
                        ].find((t) => t.id === replyTweetId) || null
                        : null
                }
                content={replyContent}
                onContentChange={setReplyContent}
                onSubmit={async () => {
                    if (!identityToken || !replyTweetId || !replyContent.trim()) return;
                    try {
                        await replyTweet(identityToken, replyContent.trim(), replyTweetId);
                        clearReplyData();
                        enqueueSnackbar("Reply posted!", { variant: "success" });
                        // Refresh the thread
                        if (tweetId) {
                            await fetchThread(identityToken, tweetId);
                        }
                    } catch (e) {
                        enqueueSnackbar(
                            e instanceof Error ? e.message : "Failed to post reply",
                            { variant: "error" }
                        );
                    }
                }}
                isSubmitting={isCreating}
            />
            <QuoteModal
                open={showQuoteModal}
                onClose={closeQuoteModal}
                tweet={
                    quoteTweetId
                        ? [
                            ...(anchorTweet ? [anchorTweet] : []),
                            ...parents,
                            ...replies,
                        ].find((t) => t.id === quoteTweetId) || null
                        : null
                }
                content={quoteContent}
                onContentChange={setQuoteContent}
                onSubmit={async () => {
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
                        
                        // Refresh the thread
                        if (tweetId) {
                            await fetchThread(identityToken, tweetId);
                        }
                    } catch (e) {
                        enqueueSnackbar(
                            e instanceof Error ? e.message : "Failed to post quote",
                            { variant: "error" }
                        );
                    }
                }}
                isSubmitting={isCreating}
            />
        </Box>
    );
}

