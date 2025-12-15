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
import { AnswerModal } from "@/components/tweets/AnswerModal";
import { QuestionThreadView } from "@/components/tweets/QuestionThreadView";

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
        fetchQuestionThread,
        threads,
        questionThreads,
        threadLoading,
        questionThreadLoading,
        threadError,
        questionThreadError,
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
        openAnswerModal,
        closeAnswerModal,
        showAnswerModal,
        answerQuestionId,
        answerContent,
        setAnswerContent,
        clearAnswerData,
        answerTweet,
    } = useTweetStore();

    const [tweet, setTweet] = useState<TweetNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAllReplies, setShowAllReplies] = useState(false);

    const thread = tweetId ? threads[tweetId] : undefined;
    const questionThread = tweetId ? questionThreads[tweetId] : undefined;
    const parents = thread?.parents ?? [];
    const replies = thread?.replies ?? [];
    const anchorTweet = thread?.tweet ?? tweet;
    
    // Check if this is a question
    const isQuestion = anchorTweet?.postState?.function === "Question" || questionThread !== undefined;

    const repliesByParent = useMemo(
        () => groupRepliesByParent(replies),
        [replies]
    );

    const anchorId = anchorTweet?.id ?? tweetId;

    const renderReplies = (
        parentId: string | undefined,
        depth: number = 0
    ): React.ReactNode => {
        if (!parentId) {
            return null;
        }

        // Try to find children by parentId
        let children = repliesByParent.get(parentId);

        // If not found, try finding by matching the ID in different formats
        if (!children || children.length === 0) {
            // Try to find replies that match this parent by checking all replies
            children = replies.filter(reply => {
                const replyParentId = reply.repliedToTweetId;
                if (!replyParentId) return false;
                // Try exact match and string comparison
                return replyParentId === parentId ||
                    String(replyParentId) === String(parentId) ||
                    replyParentId.toString() === parentId.toString();
            });
        }

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

        // For top-level replies (depth 0), implement show/hide logic
        const isTopLevel = depth === 0;
        let displayedReplies: TweetNode[];
        let hasMoreReplies = false;

        if (isTopLevel) {
            // Top-level: show all if <= 2, otherwise show first 2 with "Show All" button
            if (children.length <= 2) {
                displayedReplies = children;
            } else if (showAllReplies) {
                displayedReplies = children;
            } else {
                displayedReplies = children.slice(0, 2);
                hasMoreReplies = true;
            }
        } else {
            // Nested replies: always show all
            displayedReplies = children;
        }

        return (
            <Box sx={{ pl: depth > 0 ? 4 : 0 }}>
                {displayedReplies.map((child) => (
                    <Box key={child.id} sx={{ mb: 2 }}>
                        <Box sx={{ borderBottom: depth === 0 ? 1 : 0, borderColor: "grey.200" }}>
                            <TweetCard
                                tweet={child}
                                onReply={handleReply}
                                onQuote={handleQuote}
                                onRetweet={handleRetweet}
                                onLike={handleLike}
                                clickable={true}
                            />
                        </Box>
                        {renderReplies(child.id || "", depth + 1)}
                    </Box>
                ))}
                {hasMoreReplies && (
                    <Box sx={{ mt: 2, mb: 2, px: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setShowAllReplies(true)}
                            sx={{ textTransform: "none", width: "100%" }}
                        >
                            Show All {children.length} Replies
                        </Button>
                    </Box>
                )}
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
                // Check if it's a question and fetch appropriate thread
                if (tweetData.postState?.function === "Question") {
                    await fetchQuestionThread(identityToken || undefined, tweetId);
                } else {
                    await fetchThread(identityToken || undefined, tweetId);
                }
            } else {
                // Fallback: try regular thread
                await fetchThread(identityToken || undefined, tweetId);
            }
        } catch (error) {
            console.error("Failed to load tweet:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tweetId) {
            loadTweet();
            // Reset showAllReplies when tweet changes
            setShowAllReplies(false);
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

            {/* Question Thread View or Regular Thread View */}
            {isQuestion && questionThread ? (
                <>
                    {(questionThreadLoading || threadLoading) && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                py: 2,
                                px: 2,
                            }}
                        >
                            <CircularProgress size={20} />
                            <Typography variant="body2" color="text.secondary">
                                Loading question thread...
                            </Typography>
                        </Box>
                    )}

                    {(questionThreadError || threadError) && (
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "error.50",
                                border: 1,
                                borderColor: "error.main",
                                m: 2,
                            }}
                        >
                            <Typography color="error">
                                {questionThreadError || threadError}
                            </Typography>
                        </Box>
                    )}

                    {!questionThreadLoading && questionThread && (
                        <Box sx={{ p: 2 }}>
                            <QuestionThreadView
                                question={questionThread.question}
                                questionComments={questionThread.questionComments}
                                answers={questionThread.answers}
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
                                        if (tweetId) await fetchQuestionThread(identityToken, tweetId);
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
                                        if (tweetId) await fetchQuestionThread(identityToken, tweetId);
                                    } catch (e) {
                                        enqueueSnackbar(
                                            e instanceof Error ? e.message : "Failed to like",
                                            { variant: "error" }
                                        );
                                    }
                                }}
                                onAnswer={(tweet) => {
                                    if (!identityToken) {
                                        enqueueSnackbar("Please log in to answer", { variant: "error" });
                                        return;
                                    }
                                    openAnswerModal(tweet.id || "");
                                }}
                            />
                        </Box>
                    )}
                </>
            ) : anchorTweet ? (
                <>
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

                    {/* Replies Section - directly appended after anchor tweet */}
                    {threadLoading && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                py: 2,
                                px: 2,
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
                                m: 2,
                            }}
                        >
                            <Typography color="error">{threadError}</Typography>
                        </Box>
                    )}

                    {!threadLoading && replies.length > 0 && (
                        <Box sx={{ borderBottom: 1, borderColor: "grey.200" }}>
                            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                    {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                                </Typography>
                            </Box>
                            <Box sx={{ px: 2, pb: 2 }}>
                                {anchorId && renderReplies(anchorId)}
                            </Box>
                        </Box>
                    )}

                    {!threadLoading && replies.length === 0 && (
                        <Box sx={{ borderBottom: 1, borderColor: "grey.200", p: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                                No replies yet. Be the first to reply!
                            </Typography>
                        </Box>
                    )}
                </>
            ) : null}

            {/* Modals */}
            <ReplyModal
                open={showReplyModal}
                onClose={closeReplyModal}
                tweet={
                    replyTweetId
                        ? [
                            ...(anchorTweet ? [anchorTweet] : []),
                            ...(questionThread ? [questionThread.question] : []),
                            ...parents,
                            ...replies,
                            ...(questionThread?.questionComments || []),
                            ...(questionThread?.answers.flatMap(a => [a.answer, ...a.comments]) || []),
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
                            if (isQuestion) {
                                await fetchQuestionThread(identityToken, tweetId);
                            } else {
                                await fetchThread(identityToken, tweetId);
                            }
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
                            ...(questionThread ? [questionThread.question] : []),
                            ...parents,
                            ...replies,
                            ...(questionThread?.questionComments || []),
                            ...(questionThread?.answers.flatMap(a => [a.answer, ...a.comments]) || []),
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
                            if (isQuestion) {
                                await fetchQuestionThread(identityToken, tweetId);
                            } else {
                                await fetchThread(identityToken, tweetId);
                            }
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
            <AnswerModal
                open={showAnswerModal}
                onClose={closeAnswerModal}
                question={
                    answerQuestionId
                        ? (questionThread?.question ||
                            (anchorTweet?.postState?.function === "Question" ? anchorTweet : null) ||
                            (tweet?.postState?.function === "Question" ? tweet : null) ||
                            null)
                        : null
                }
                content={answerContent}
                onContentChange={setAnswerContent}
                onSubmit={async () => {
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
                        
                        // Refresh the question thread
                        if (tweetId) {
                            await fetchQuestionThread(identityToken, tweetId);
                        }
                    } catch (e) {
                        enqueueSnackbar(
                            e instanceof Error ? e.message : "Failed to post answer",
                            { variant: "error" }
                        );
                    }
                }}
                isSubmitting={isCreating}
            />
        </Box>
    );
}

