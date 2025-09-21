'use client';

import React from 'react';
import {
    Card,
    CardContent,
    Avatar,
    Typography,
    IconButton,
    Box,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Stack,
} from '@mui/material';
import {
    Favorite,
    FavoriteBorder,
    Repeat,
    ChatBubbleOutline,
    Share,
    MoreHoriz,
} from '@mui/icons-material';
import { useTweetsStore } from '../lib/stores/tweetsStore';

interface Tweet {
    id: string | { $oid: string };
    content: string;
    tweet_type: "Original" | "Retweet" | "Quote";
    original_tweet_id?: string | { $oid: string };
    created_at: string | { $date: { $numberLong: string } };
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    is_liked: boolean;
    is_retweeted: boolean;
    media_urls?: string[];
    author_id: string | { $oid: string };
    author_username: string | null;
    author_display_name: string;
    author_avatar_url?: string | null;
    author_is_verified?: boolean;
}

interface TweetCardProps {
    tweet: Tweet;
    onLike: (tweetId: string) => void;
    onRetweet: (tweetId: string) => void;
    onQuote: (tweetId: string, content: string) => void;
}

export function TweetCard({ tweet, onLike, onRetweet, onQuote }: TweetCardProps) {
    const {
        showQuoteModal,
        quoteTweetId,
        quoteContent,
        openQuoteModal,
        closeQuoteModal,
        setQuoteContent,
        clearQuoteData
    } = useTweetsStore();

    // Helper function to extract ID from either string or ObjectId format
    const getTweetId = () => {
        return typeof tweet.id === 'string' ? tweet.id : tweet.id?.$oid || '';
    };

    // Helper function to format date from either string or MongoDB date format
    const formatTimeAgo = (dateInput: string | { $date: { $numberLong: string } }) => {
        let date: Date;

        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else {
            // Handle MongoDB date format
            const timestamp = parseInt(dateInput.$date.$numberLong);
            date = new Date(timestamp);
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        return date.toLocaleDateString();
    };

    const handleLike = () => {
        onLike(getTweetId());
    };

    const handleRetweet = () => {
        onRetweet(getTweetId());
    };

    const handleQuote = () => {
        openQuoteModal(getTweetId());
    };

    const handleQuoteSubmit = () => {
        if (quoteContent.trim()) {
            onQuote(getTweetId(), quoteContent.trim());
            clearQuoteData();
        }
    };

    const getTweetTypeColor = (type: string) => {
        switch (type) {
            case 'Retweet':
                return 'success';
            case 'Quote':
                return 'primary';
            default:
                return 'default';
        }
    };

    const getTweetTypeIcon = (type: string) => {
        switch (type) {
            case 'Retweet':
                return <Repeat fontSize="small" />;
            case 'Quote':
                return <ChatBubbleOutline fontSize="small" />;
            default:
                return undefined;
        }
    };

    return (
        <>
            <Card
                sx={{
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 1,
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    }
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {/* Avatar */}
                        <Avatar
                            src={tweet.author_avatar_url || undefined}
                            sx={{ width: 48, height: 48 }}
                        >
                            {tweet.author_display_name?.charAt(0).toUpperCase() || '😈'}
                        </Avatar>

                        {/* Tweet Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {tweet.author_display_name}
                                </Typography>
                                {tweet.author_is_verified && (
                                    <Typography color="primary" sx={{ fontSize: '0.875rem' }}>
                                        ✓
                                    </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                    @{tweet.author_username}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    ·
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {formatTimeAgo(tweet.created_at)}
                                </Typography>
                                <IconButton size="small" sx={{ ml: 'auto' }}>
                                    <MoreHoriz fontSize="small" />
                                </IconButton>
                            </Box>

                            {/* Tweet Type Indicator */}
                            {tweet.tweet_type !== 'Original' && (
                                <Box sx={{ mb: 1 }}>
                                    <Chip
                                        icon={getTweetTypeIcon(tweet.tweet_type)}
                                        label={tweet.tweet_type === 'Retweet' ? 'Retweeted' : 'Quoted'}
                                        size="small"
                                        color={getTweetTypeColor(tweet.tweet_type)}
                                        variant="outlined"
                                    />
                                </Box>
                            )}

                            {/* Tweet Text */}
                            <Typography
                                variant="body1"
                                sx={{
                                    mb: tweet.media_urls?.length ? 2 : 1,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}
                            >
                                {tweet.content}
                            </Typography>

                            {/* Media */}
                            {tweet.media_urls && tweet.media_urls.length > 0 && (
                                <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
                                    <img
                                        src={tweet.media_urls[0]}
                                        alt="Tweet media"
                                        style={{
                                            width: '100%',
                                            maxHeight: '300px',
                                            objectFit: 'cover',
                                        }}
                                    />
                                </Box>
                            )}

                            {/* Actions */}
                            <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
                                {/* Reply */}
                                <IconButton size="small" color="default">
                                    <ChatBubbleOutline fontSize="small" />
                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                        {tweet.replies_count}
                                    </Typography>
                                </IconButton>

                                {/* Retweet */}
                                <IconButton
                                    size="small"
                                    color="success"
                                    onClick={handleRetweet}
                                >
                                    <Repeat fontSize="small" />
                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                        {tweet.retweets_count}
                                    </Typography>
                                </IconButton>

                                {/* Quote */}
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleQuote}
                                >
                                    <ChatBubbleOutline fontSize="small" />
                                </IconButton>

                                {/* Like */}
                                <IconButton
                                    size="small"
                                    color={tweet.is_liked ? 'error' : 'default'}
                                    onClick={handleLike}
                                >
                                    {tweet.is_liked ? (
                                        <Favorite fontSize="small" />
                                    ) : (
                                        <FavoriteBorder fontSize="small" />
                                    )}
                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                        {tweet.likes_count}
                                    </Typography>
                                </IconButton>

                                {/* Share */}
                                <IconButton size="small" color="default">
                                    <Share fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Quote Tweet Modal */}
            <Dialog
                open={showQuoteModal && quoteTweetId === getTweetId()}
                onClose={closeQuoteModal}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Quote Tweet</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        placeholder="Add a comment..."
                        value={quoteContent}
                        onChange={(e) => setQuoteContent(e.target.value)}
                        inputProps={{ maxLength: 280 }}
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {quoteContent.length}/280
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeQuoteModal}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleQuoteSubmit}
                        variant="contained"
                        disabled={!quoteContent.trim()}
                    >
                        Quote Tweet
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}