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
import { useRouter } from "next/navigation";
import { TweetNode } from "@/lib/graphql/tweets/types";
import { VoteButtons } from "./VoteButtons";

interface TweetCardProps {
    tweet: TweetNode;
    onReply?: (tweet: TweetNode) => void;
    onQuote?: (tweet: TweetNode) => void;
    onRetweet?: (tweet: TweetNode) => void;
    onLike?: (tweet: TweetNode) => void;
    clickable?: boolean; // Whether the card should be clickable to navigate to detail page
}

export function TweetCard({
    tweet,
    onReply,
    onQuote,
    onRetweet,
    onLike,
    clickable = true,
}: TweetCardProps) {
    const router = useRouter();
    const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true });
    const author = tweet.author;

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
                borderColor: "grey.200",
                cursor: clickable ? "pointer" : "default",
                "&:hover": {
                    bgcolor: clickable ? "grey.50" : "transparent",
                },
                transition: "background-color 0.2s",
            }}
            elevation={0}
        >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" spacing={2}>
                    {/* Avatar */}
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

                    {/* Content */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {/* Header */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {author?.displayName || "Unknown"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                @{author?.handle || "unknown"}
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
                                        src={tweet.quotedTweet.author?.avatarUrl || undefined}
                                        sx={{ width: 20, height: 20, bgcolor: "primary.main" }}
                                    >
                                        {tweet.quotedTweet.author?.displayName?.charAt(0).toUpperCase() || "?"}
                                    </Avatar>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {tweet.quotedTweet.author?.displayName || "Unknown"}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        @{tweet.quotedTweet.author?.handle || "unknown"}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2">{tweet.quotedTweet.content}</Typography>
                            </Box>
                        )}

                        {/* Post State Display for Original Tweets */}
                        {tweet.postIdHash && tweet.postState && (
                            <Box
                                sx={{
                                    mt: 1,
                                    mb: 1,
                                    p: 1.5,
                                    bgcolor: tweet.postState.state === "Open" ? "info.50" : "grey.100",
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: tweet.postState.state === "Open" ? "info.200" : "grey.300",
                                }}
                            >
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <Chip
                                        label={tweet.postState.state}
                                        size="small"
                                        color={tweet.postState.state === "Open" ? "info" : "default"}
                                        sx={{ fontWeight: 600 }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        Pump: {tweet.postState.upvotes.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
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
                                    {tweet.postState.state === "Open" && (
                                        <Typography variant="caption" color="text.secondary">
                                            Ends: {new Date(tweet.postState.endTime * 1000).toLocaleString()}
                                        </Typography>
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRetweet?.(tweet);
                                    }}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLike?.(tweet);
                                    }}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onQuote?.(tweet);
                                    }}
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

