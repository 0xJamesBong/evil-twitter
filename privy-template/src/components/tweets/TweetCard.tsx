"use client";

import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Avatar,
    Stack,
    Chip,
} from "@mui/material";
import {
    ChatBubbleOutline as ReplyIcon,
    Repeat as RetweetIcon,
    FormatQuote as QuoteIcon,
    FavoriteBorder as LikeIcon,
    MoreHoriz as MoreIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";

export interface MockTweet {
    id: string;
    content: string;
    author: {
        handle: string;
        displayName: string;
        avatarUrl?: string;
    };
    createdAt: Date;
    metrics: {
        likes: number;
        retweets: number;
        quotes: number;
        replies: number;
    };
    tweetType: "Original" | "Reply" | "Quote" | "Retweet";
    quotedTweet?: MockTweet;
    repliedToTweet?: MockTweet;
}

interface TweetCardProps {
    tweet: MockTweet;
    onReply?: (tweet: MockTweet) => void;
    onQuote?: (tweet: MockTweet) => void;
    onRetweet?: (tweet: MockTweet) => void;
    onLike?: (tweet: MockTweet) => void;
}

export function TweetCard({
    tweet,
    onReply,
    onQuote,
    onRetweet,
    onLike,
}: TweetCardProps) {
    const timeAgo = formatDistanceToNow(tweet.createdAt, { addSuffix: true });

    return (
        <Card
            sx={{
                borderRadius: 0,
                borderBottom: 1,
                borderColor: "grey.200",
                "&:hover": {
                    bgcolor: "grey.50",
                },
                transition: "background-color 0.2s",
            }}
            elevation={0}
        >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" spacing={2}>
                    {/* Avatar */}
                    <Avatar
                        src={tweet.author.avatarUrl}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "primary.main",
                        }}
                    >
                        {tweet.author.displayName.charAt(0).toUpperCase()}
                    </Avatar>

                    {/* Content */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Header */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {tweet.author.displayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                @{tweet.author.handle}
                            </Typography>
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
                                    bgcolor: "primary.50",
                                    color: "primary.main",
                                }}
                            />
                        )}

                        {/* Content */}
                        <Typography
                            variant="body1"
                            sx={{
                                mb: 1,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {tweet.content}
                        </Typography>

                        {/* Quoted Tweet */}
                        {tweet.quotedTweet && (
                            <Box
                                sx={{
                                    border: 1,
                                    borderColor: "grey.300",
                                    borderRadius: 2,
                                    p: 2,
                                    mt: 1,
                                    bgcolor: "grey.50",
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <Avatar
                                        src={tweet.quotedTweet.author.avatarUrl}
                                        sx={{ width: 20, height: 20, bgcolor: "primary.main" }}
                                    >
                                        {tweet.quotedTweet.author.displayName.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {tweet.quotedTweet.author.displayName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        @{tweet.quotedTweet.author.handle}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2">{tweet.quotedTweet.content}</Typography>
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
                                    onClick={() => onReply?.(tweet)}
                                    className="reply-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "primary.50" },
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
                                    onClick={() => onRetweet?.(tweet)}
                                    className="retweet-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "success.50" },
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
                                    onClick={() => onLike?.(tweet)}
                                    className="like-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "error.50" },
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
                                    onClick={() => onQuote?.(tweet)}
                                    className="quote-icon"
                                    sx={{
                                        color: "text.secondary",
                                        "&:hover": { bgcolor: "primary.50" },
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
                        </Stack>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

