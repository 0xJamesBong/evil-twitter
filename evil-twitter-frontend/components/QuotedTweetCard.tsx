'use client';

import React from 'react';
import {
    Card,
    CardContent,
    Avatar,
    Typography,
    Box,
} from '@mui/material';

interface Tweet {
    _id: { $oid: string };
    content: string;
    tweet_type: "Original" | "Retweet" | "Quote" | "Reply";
    created_at: { $date: { $numberLong: string } };
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    media_urls?: string[];
    owner_id: { $oid: string };
    author_username: string | null;
    author_display_name: string;
    author_avatar_url?: string | null;
    author_is_verified?: boolean;
    health: number;
}

interface QuotedTweetCardProps {
    tweet: Tweet;
}

export function QuotedTweetCard({ tweet }: QuotedTweetCardProps) {
    // Helper function to format date from MongoDB date format
    const formatTimeAgo = (dateInput: { $date: { $numberLong: string } }) => {
        const timestamp = parseInt(dateInput.$date.$numberLong);
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        return date.toLocaleDateString();
    };

    return (
        <Card
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                mt: 1,
                mb: 1,
                backgroundColor: 'transparent',
                boxShadow: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {/* Avatar */}
                    <Avatar
                        src={tweet.author_avatar_url || undefined}
                        sx={{ width: 20, height: 20, fontSize: '0.75rem' }}
                    >
                        {tweet.author_display_name?.charAt(0).toUpperCase() || '😈'}
                    </Avatar>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '150px'
                                }}
                            >
                                {tweet.author_display_name}
                            </Typography>
                            {tweet.author_is_verified && (
                                <Typography color="primary" sx={{ fontSize: '0.75rem' }}>
                                    ✓
                                </Typography>
                            )}
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.875rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100px'
                                }}
                            >
                                @{tweet.author_username}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                ·
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                {formatTimeAgo(tweet.created_at)}
                            </Typography>
                        </Box>

                        {/* Tweet Text */}
                        <Typography
                            variant="body2"
                            sx={{
                                mb: tweet.media_urls?.length ? 1 : 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                            }}
                        >
                            {tweet.content}
                        </Typography>

                        {/* Media */}
                        {tweet.media_urls && tweet.media_urls.length > 0 && (
                            <Box sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                                <img
                                    src={tweet.media_urls[0]}
                                    alt="Tweet media"
                                    style={{
                                        width: '100%',
                                        maxHeight: '200px',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

