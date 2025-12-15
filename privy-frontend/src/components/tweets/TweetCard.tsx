"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Avatar,
    Stack,
    Chip,
    Tooltip,
} from "@mui/material";
import "@/theme/types"; // Import type declarations
import {
    ChatBubbleOutline as ReplyIcon,
    Repeat as RetweetIcon,
    FormatQuote as QuoteIcon,
    FavoriteBorder as LikeIcon,
    MoreHoriz as MoreIcon,
    QuestionAnswer as AnswerIcon,
    QuestionAnswer as QuestionAnswerIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { VoteButtons } from "./VoteButtons";
import { RewardCollection } from "./RewardCollection";
import { useUser, useIdentityToken } from "@privy-io/react-auth";
import { useSettlePost } from "@/hooks/useSettlePost";
import { Button, CircularProgress } from "@mui/material";
import { AccountBalance as SettleIcon } from "@mui/icons-material";
import { useTweetStore } from "@/lib/stores/tweetStore";
import { TipButton } from "@/components/tips/TipButton";
import { Language } from "@/lib/graphql/types";
import { parseLanguage, getFontFamilyForLanguage, LANGUAGE_FONT_FAMILY } from "@/lib/utils/language";

interface TweetCardProps {
    tweet: TweetNode;
    onReply?: (tweet: TweetNode) => void;
    onQuote?: (tweet: TweetNode) => void;
    onAnswer?: (tweet: TweetNode) => void;
    onRetweet?: (tweet: TweetNode) => void;
    onLike?: (tweet: TweetNode) => void;
    clickable?: boolean; // Whether the card should be clickable to navigate to detail page
}

export function TweetCard({
    tweet,
    onReply,
    onQuote,
    onAnswer,
    onRetweet,
    onLike,
    clickable = true,
}: TweetCardProps) {
    const router = useRouter();
    const { user } = useUser();
    const { identityToken } = useIdentityToken();
    const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true });
    const author = tweet.author;
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState<boolean>(false);
    const currentUserId = user?.id;
    const { settlePost, loading: settleLoading } = useSettlePost();
    const { fetchTimeline } = useTweetStore();
    const answeredQuestion =
        tweet.postState?.function === "Answer" ? tweet.repliedToTweet : null;

    const handleSettlePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!tweet.id) return;

        try {
            // Settle the post and refresh the timeline after success
            await settlePost(tweet.id, async () => {
                // Refresh the timeline to show updated post state
                await fetchTimeline(identityToken || undefined);
            });
        } catch (error) {
            // Error is already handled in the hook
            console.error("Failed to settle post:", error);
        }
    };

    // Calculate and update time left for open posts
    useEffect(() => {
        if (!tweet.postState || tweet.postState.state !== "Open" || !tweet.postState.endTime) {
            setTimeLeft("");
            setIsExpired(false);
            return;
        }

        const updateTimeLeft = () => {
            const now = Math.floor(Date.now() / 1000);
            const endTime = tweet.postState!.endTime!;
            const secondsLeft = endTime - now;

            // Update expired state
            setIsExpired(secondsLeft <= 0);

            if (secondsLeft <= 0) {
                setTimeLeft("Ended");
                return;
            }

            const days = Math.floor(secondsLeft / 86400);
            const hours = Math.floor((secondsLeft % 86400) / 3600);
            const minutes = Math.floor((secondsLeft % 3600) / 60);
            const seconds = secondsLeft % 60;

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h left`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m left`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s left`);
            } else {
                setTimeLeft(`${seconds}s left`);
            }
        };

        // Update immediately
        updateTimeLeft();

        // Update every second
        const interval = setInterval(updateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [tweet.postState]);

    const handleCardClick = () => {
        if (clickable && tweet.id) {
            router.push(`/tweets/${tweet.id}`);
        }
    };

    return (
        <Card
            onClick={handleCardClick}
            sx={{
                borderRadius: 0,
                borderBottom: 1,
                borderColor: "rgba(255,255,255,0.06)",
                bgcolor: "background.paper",
                cursor: clickable ? "pointer" : "default",
                "&:hover": {
                    bgcolor: clickable ? "rgba(255,255,255,0.05)" : "background.paper",
                },
                transition: "background-color 0.2s",
            }}
            elevation={0}
        >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" spacing={2}>
                    {/* Avatar */}
                    {author?.handle ? (
                        <Link
                            href={`/${author.handle.replace(/^@+/, "")}`}
                            style={{ textDecoration: "none" }}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                router.push(`/${author.handle.replace(/^@+/, "")}`);
                            }}
                        >
                            <Avatar
                                src={author?.avatarUrl || undefined}
                                sx={{
                                    width: 48,
                                    height: 48,
                                    bgcolor: "primary.main",
                                    cursor: "pointer",
                                    "&:hover": {
                                        opacity: 0.8,
                                    },
                                }}
                            >
                                {author?.displayName?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                        </Link>
                    ) : author?.userId ? (
                        <Link
                            href={`/user/${author.userId}`}
                            style={{ textDecoration: "none" }}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                router.push(`/user/${author.userId}`);
                            }}
                        >
                            <Avatar
                                src={author?.avatarUrl || undefined}
                                sx={{
                                    width: 48,
                                    height: 48,
                                    bgcolor: "primary.main",
                                    cursor: "pointer",
                                    "&:hover": {
                                        opacity: 0.8,
                                    },
                                }}
                            >
                                {author?.displayName?.charAt(0).toUpperCase() || "?"}
                            </Avatar>
                        </Link>
                    ) : (
                        <Avatar
                            src={author?.avatarUrl || undefined}
                            sx={{
                                width: 48,
                                height: 48,
                                bgcolor: "primary.main",
                            }}
                        >
                            {author?.displayName?.charAt(0).toUpperCase() || "?"}
                        </Avatar>
                    )}

                    {/* Content */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Header */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            {author?.handle ? (
                                <Link
                                    href={`/${author.handle.replace(/^@+/, "")}`}
                                    style={{ textDecoration: "none", color: "inherit" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        router.push(`/${author.handle.replace(/^@+/, "")}`);
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 700,
                                            "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                        }}
                                    >
                                        {author?.displayName || "Unknown"}
                                    </Typography>
                                </Link>
                            ) : author?.userId ? (
                                <Link
                                    href={`/user/${author.userId}`}
                                    style={{ textDecoration: "none", color: "inherit" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        router.push(`/user/${author.userId}`);
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            fontWeight: 700,
                                            "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                        }}
                                    >
                                        {author?.displayName || "Unknown"}
                                    </Typography>
                                </Link>
                            ) : (
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {author?.displayName || "Unknown"}
                                </Typography>
                            )}
                            {author?.handle ? (
                                <Link
                                    href={`/${author.handle.replace(/^@+/, "")}`}
                                    style={{ textDecoration: "none", color: "inherit" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        router.push(`/${author.handle.replace(/^@+/, "")}`);
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                        }}
                                    >
                                        @{author.handle.replace(/^@+/, "")}
                                    </Typography>
                                </Link>
                            ) : author?.userId ? (
                                <Link
                                    href={`/user/${author.userId}`}
                                    style={{ textDecoration: "none", color: "inherit" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        router.push(`/user/${author.userId}`);
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                        }}
                                    >
                                        @{author?.handle || "unknown"}
                                    </Typography>
                                </Link>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    @{author?.handle || "unknown"}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                ·
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {timeAgo}
                            </Typography>
                            <Box sx={{ flexGrow: 1 }} />
                            <IconButton size="small" sx={{ color: "text.secondary" }}>
                                <MoreIcon fontSize="small" />
                            </IconButton>
                        </Stack>

                        {/* Tweet Type Badge */}
                        {tweet.tweetType !== "Original" && (
                            <Chip
                                label={tweet.tweetType}
                                size="small"
                                sx={{
                                    mb: 1,
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: "rgba(63,169,245,0.2)",
                                    color: "primary.main",
                                }}
                            />
                        )}

                        {/* Question Badge */}
                        {tweet.postState?.function === "Question" && (
                            <Chip
                                icon={<QuestionAnswerIcon fontSize="small" />}
                                label="Question"
                                size="small"
                                sx={{
                                    mb: 1,
                                    ml: tweet.tweetType !== "Original" ? 1 : 0,
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: "rgba(255,193,7,0.2)",
                                    color: "warning.main",
                                    fontWeight: 600,
                                }}
                            />
                        )}

                        {/* Answer Badge */}
                        {tweet.postState?.function === "Answer" && (
                            <Chip
                                icon={<QuestionAnswerIcon fontSize="small" />}
                                label="Answer"
                                size="small"
                                sx={{
                                    mb: 1,
                                    ml: tweet.tweetType !== "Original" ? 1 : 0,
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: "rgba(76,175,80,0.2)",
                                    color: "success.main",
                                    fontWeight: 600,
                                }}
                            />
                        )}

                        {/* Answered Question Reference */}
                        {answeredQuestion?.id && (
                            <Box
                                sx={{
                                    mb: 1.5,
                                    p: 1,
                                    bgcolor: "rgba(255,193,7,0.08)",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 1,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/tweets/${answeredQuestion.id}`);
                                }}
                            >
                                <QuestionAnswerIcon
                                    fontSize="small"
                                    sx={{ color: "warning.main", mt: "2px" }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                                        Answering
                                    </Typography>
                                    <Link
                                        href={`/tweets/${answeredQuestion.id}`}
                                        style={{ textDecoration: "none", color: "inherit" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            router.push(`/tweets/${answeredQuestion.id}`);
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "text.primary",
                                                whiteSpace: "nowrap",
                                                textOverflow: "ellipsis",
                                                overflow: "hidden",
                                                display: "block",
                                            }}
                                        >
                                            {answeredQuestion.content}
                                        </Typography>
                                    </Link>
                                </Box>
                            </Box>
                        )}

                        {/* Content */}
                        {(() => {
                            // Convert string to Language enum and get font family
                            const tweetLanguage = parseLanguage(tweet.language);
                            const fontFamily = getFontFamilyForLanguage(tweetLanguage);

                            // Debug: log language and font for Goetsuan to troubleshoot
                            if (tweetLanguage === Language.GOETSUAN) {
                                console.log('🔍 Goetsuan tweet rendering:', {
                                    originalLanguage: tweet.language,
                                    tweetLanguage,
                                    fontFamily,
                                    expectedFont: LANGUAGE_FONT_FAMILY[Language.GOETSUAN],
                                    allFonts: LANGUAGE_FONT_FAMILY
                                });
                            }

                            return (
                                <Typography
                                    variant="body1"
                                    sx={{
                                        mb: 1,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        ...(fontFamily && {
                                            fontFamily,
                                            // Ensure font is applied with higher specificity
                                            '& *': {
                                                fontFamily: 'inherit',
                                            },
                                        }),
                                    }}
                                >
                                    {tweet.content}
                                </Typography>
                            );
                        })()}

                        {/* Quoted Tweet */}
                        {tweet.quotedTweet && (
                            <Box
                                sx={{
                                    border: 1,
                                    borderColor: "rgba(255,255,255,0.06)",
                                    borderRadius: 2,
                                    p: 2,
                                    mt: 1,
                                    bgcolor: "#181C20",
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    {tweet.quotedTweet.author?.handle ? (
                                        <Link
                                            href={`/${tweet.quotedTweet.author.handle.replace(/^@+/, "")}`}
                                            style={{ textDecoration: "none" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                router.push(`/${tweet.quotedTweet.author.handle.replace(/^@+/, "")}`);
                                            }}
                                        >
                                            <Avatar
                                                src={tweet.quotedTweet.author?.avatarUrl || undefined}
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    bgcolor: "primary.main",
                                                    cursor: "pointer",
                                                    "&:hover": {
                                                        opacity: 0.8,
                                                    },
                                                }}
                                            >
                                                {tweet.quotedTweet.author?.displayName?.charAt(0).toUpperCase() || "?"}
                                            </Avatar>
                                        </Link>
                                    ) : tweet.quotedTweet.author?.userId ? (
                                        <Link
                                            href={`/user/${tweet.quotedTweet.author.userId}`}
                                            style={{ textDecoration: "none" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                router.push(`/user/${tweet.quotedTweet.author.userId}`);
                                            }}
                                        >
                                            <Avatar
                                                src={tweet.quotedTweet.author?.avatarUrl || undefined}
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    bgcolor: "primary.main",
                                                    cursor: "pointer",
                                                    "&:hover": {
                                                        opacity: 0.8,
                                                    },
                                                }}
                                            >
                                                {tweet.quotedTweet.author?.displayName?.charAt(0).toUpperCase() || "?"}
                                            </Avatar>
                                        </Link>
                                    ) : (
                                        <Avatar
                                            src={tweet.quotedTweet.author?.avatarUrl || undefined}
                                            sx={{ width: 20, height: 20, bgcolor: "primary.main" }}
                                        >
                                            {tweet.quotedTweet.author?.displayName?.charAt(0).toUpperCase() || "?"}
                                        </Avatar>
                                    )}
                                    {tweet.quotedTweet.author?.handle ? (
                                        <Link
                                            href={`/${tweet.quotedTweet.author.handle.replace(/^@+/, "")}`}
                                            style={{ textDecoration: "none", color: "inherit" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                router.push(`/${tweet.quotedTweet.author.handle.replace(/^@+/, "")}`);
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontWeight: 600,
                                                    "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                                }}
                                            >
                                                {tweet.quotedTweet.author?.displayName || "Unknown"}
                                            </Typography>
                                        </Link>
                                    ) : (
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                            {tweet.quotedTweet.author?.displayName || "Unknown"}
                                        </Typography>
                                    )}
                                    {tweet.quotedTweet.author?.handle ? (
                                        <Link
                                            href={`/${tweet.quotedTweet.author.handle.replace(/^@+/, "")}`}
                                            style={{ textDecoration: "none", color: "inherit" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                router.push(`/${tweet.quotedTweet.author.handle.replace(/^@+/, "")}`);
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    "&:hover": { textDecoration: "underline", cursor: "pointer" },
                                                }}
                                            >
                                                @{tweet.quotedTweet.author.handle.replace(/^@+/, "")}
                                            </Typography>
                                        </Link>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            @{tweet.quotedTweet.author?.handle?.replace(/^@+/, "") || "unknown"}
                                        </Typography>
                                    )}
                                </Stack>
                                {(() => {
                                    // Convert quoted tweet language string to Language enum
                                    const quotedLanguage = parseLanguage(tweet.quotedTweet.language);
                                    const quotedFontFamily = getFontFamilyForLanguage(quotedLanguage);
                                    return (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                ...(quotedFontFamily && { fontFamily: quotedFontFamily }),
                                            }}
                                        >
                                            {tweet.quotedTweet.content}
                                        </Typography>
                                    );
                                })()}
                            </Box>
                        )}

                        {/* Post State Display for Original Tweets */}
                        {tweet.postIdHash && tweet.postState && (
                            <Box
                                sx={{
                                    mt: 1,
                                    mb: 1,
                                    p: 1.5,
                                    bgcolor: tweet.postState?.state === "Open"
                                        ? "rgba(40,231,213,0.15)"
                                        : "#181C20",
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: tweet.postState.state === "Open"
                                        ? "rgba(40,231,213,0.3)"
                                        : "rgba(255,255,255,0.06)",
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <Chip
                                        label={tweet.postState.state}
                                        size="small"
                                        color={tweet.postState.state === "Open" ? "info" : "default"}
                                        sx={{ fontWeight: 600 }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: "#FFFFFF",
                                            fontWeight: 500
                                        }}
                                    >
                                        Pump: {tweet.postState.upvotes.toLocaleString()}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: "#FFFFFF",
                                            fontWeight: 500
                                        }}
                                    >
                                        Smack: {tweet.postState.downvotes.toLocaleString()}
                                    </Typography>
                                    {tweet.postState.state === "Settled" && tweet.postState.winningSide && (
                                        <Chip
                                            label={`Winner: ${tweet.postState.winningSide}`}
                                            size="small"
                                            color="success"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    )}
                                    {tweet.postState.state === "Open" && timeLeft && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "#FFFFFF",
                                                fontWeight: 600,
                                                fontSize: "0.75rem"
                                            }}
                                        >
                                            {timeLeft}
                                        </Typography>
                                    )}
                                    {/* Settle Post Button - Only show for Open posts */}
                                    {tweet.postState.state === "Open" && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            startIcon={settleLoading ? <CircularProgress size={14} /> : <SettleIcon />}
                                            onClick={handleSettlePost}
                                            disabled={settleLoading || !isExpired}
                                            sx={{
                                                ml: "auto",
                                                minWidth: 120,
                                                fontSize: "0.75rem",
                                                opacity: !isExpired ? 0.5 : 1,
                                            }}
                                        >
                                            {settleLoading ? "Settling..." : "Settle Post"}
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        )}

                        {/* Voting Buttons for Original Tweets */}
                        {tweet.postIdHash && (
                            <Box
                                sx={{ mt: 1, mb: 1 }}
                                onClick={(e) => {
                                    // Stop click event from bubbling to card navigation
                                    e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                    // Also stop mousedown to prevent any drag/selection issues
                                    e.stopPropagation();
                                }}
                            >
                                <VoteButtons tweet={tweet} />
                            </Box>
                        )}

                        {/* Reward Collection for Settled Posts */}
                        {tweet.postIdHash && (
                            <Box
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                <RewardCollection tweet={tweet} currentUserId={currentUserId} />
                            </Box>
                        )}

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={4} sx={{ mt: 2, maxWidth: 500 }}>
                            {/* Reply */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    "&:hover": {
                                        "& .reply-icon": { color: "primary.main" },
                                        "& .reply-count": { color: "primary.main" },
                                    },
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReply?.(tweet);
                                    }}
                                    className="reply-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "rgba(63,169,245,0.15)" },
                                    }}
                                >
                                    <ReplyIcon fontSize="small" />
                                </IconButton>
                                {tweet.metrics.replies > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        className="reply-count"
                                        sx={{ minWidth: 24, userSelect: "none" }}
                                    >
                                        {tweet.metrics.replies}
                                    </Typography>
                                )}
                            </Box>

                            {/* Retweet */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    "&:hover": {
                                        "& .retweet-icon": { color: "success.main" },
                                        "& .retweet-count": { color: "success.main" },
                                    },
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRetweet?.(tweet);
                                    }}
                                    className="retweet-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "rgba(43,227,139,0.15)" },
                                    }}
                                >
                                    <RetweetIcon fontSize="small" />
                                </IconButton>
                                {tweet.metrics.retweets > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        className="retweet-count"
                                        sx={{ minWidth: 24, userSelect: "none" }}
                                    >
                                        {tweet.metrics.retweets}
                                    </Typography>
                                )}
                            </Box>

                            {/* Like */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    "&:hover": {
                                        "& .like-icon": { color: "error.main" },
                                        "& .like-count": { color: "error.main" },
                                    },
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLike?.(tweet);
                                    }}
                                    className="like-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "rgba(255,71,108,0.15)" },
                                    }}
                                >
                                    <LikeIcon fontSize="small" />
                                </IconButton>
                                {tweet.metrics.likes > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        className="like-count"
                                        sx={{ minWidth: 24, userSelect: "none" }}
                                    >
                                        {tweet.metrics.likes}
                                    </Typography>
                                )}
                            </Box>

                            {/* Quote */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    cursor: "pointer",
                                    "&:hover": {
                                        "& .quote-icon": { color: "primary.main" },
                                        "& .quote-count": { color: "primary.main" },
                                    },
                                }}
                            >
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onQuote?.(tweet);
                                    }}
                                    className="quote-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "rgba(63,169,245,0.15)" },
                                    }}
                                >
                                    <QuoteIcon fontSize="small" />
                                </IconButton>
                                {tweet.metrics.quotes > 0 && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        className="quote-count"
                                        sx={{ minWidth: 24, userSelect: "none" }}
                                    >
                                        {tweet.metrics.quotes}
                                    </Typography>
                                )}
                            </Box>

                            {/* Answer - Show only for questions */}
                            {tweet.postIdHash && tweet.postState?.function === "Question" && (
                                <Tooltip title="Answer" arrow>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                            cursor: "pointer",
                                            "&:hover": {
                                                "& .answer-icon": { color: "warning.main" },
                                            },
                                        }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAnswer?.(tweet);
                                            }}
                                            className="answer-icon"
                                            sx={{
                                                color: "text.secondary",
                                                "&:hover": { bgcolor: "rgba(255,193,7,0.15)" },
                                            }}
                                        >
                                            <AnswerIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Tooltip>
                            )}

                            {/* Tip - Show for all tweets with postId */}
                            {tweet.id && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        cursor: "pointer",
                                        "&:hover": {
                                            "& .tip-icon": { color: "warning.main" },
                                        },
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <TipButton
                                        postId={tweet.id}
                                        size="small"
                                        variant="icon"
                                    />
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}
