'use client';

import React from 'react';
import {
    Avatar,
    Typography,
    Box,
} from '@mui/material';

export interface TweetData {
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
    health_history?: {
        health: number;
        heal_history: any[];
        attack_history: any[];
    };
    quoted_tweet?: TweetData;
    replied_to_tweet?: TweetData;
}

interface TweetContentProps {
    tweet: TweetData;
    variant?: 'full' | 'compact' | 'quoted';
    showHeader?: boolean;
    showMedia?: boolean;
    renderQuotedTweet?: (tweet: TweetData) => React.ReactNode;
}

export function TweetContent({
    tweet,
    variant = 'full',
    showHeader = true,
    showMedia = true,
    renderQuotedTweet
}: TweetContentProps) {
    // Helper function to format date
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

    // Determine sizes based on variant
    const avatarSize = variant === 'quoted' ? 20 : 48;
    const fontSize = variant === 'quoted' ? '0.875rem' : '1rem';
    const headerFontSize = variant === 'quoted' ? '0.875rem' : 'subtitle2';
    const maxMediaHeight = variant === 'quoted' ? '200px' : '300px';

    return (
        <Box sx={{ display: 'flex', gap: variant === 'quoted' ? 1.5 : 2 }}>
            {/* Avatar */}
            <Avatar
                src={tweet.author_avatar_url || undefined}
                sx={{
                    width: avatarSize,
                    height: avatarSize,
                    fontSize: variant === 'quoted' ? '0.75rem' : 'inherit'
                }}
            >
                {tweet.author_display_name?.charAt(0).toUpperCase() || '😈'}
            </Avatar>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Header */}
                {showHeader && (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: variant === 'quoted' ? 0.5 : 1,
                        mb: variant === 'quoted' ? 0.5 : 1,
                        flexWrap: 'wrap'
                    }}>
                        <Typography
                            variant={typeof headerFontSize === 'string' ? 'body2' : headerFontSize}
                            sx={{
                                fontWeight: 600,
                                fontSize: headerFontSize,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: variant === 'quoted' ? '150px' : 'none'
                            }}
                        >
                            {tweet.author_display_name}
                        </Typography>
                        {tweet.author_is_verified && (
                            <Typography color="primary" sx={{ fontSize: variant === 'quoted' ? '0.75rem' : '0.875rem' }}>
                                ✓
                            </Typography>
                        )}
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                fontSize: headerFontSize,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: variant === 'quoted' ? '100px' : 'none'
                            }}
                        >
                            @{tweet.author_username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: headerFontSize }}>
                            ·
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: headerFontSize }}>
                            {formatTimeAgo(tweet.created_at)}
                        </Typography>
                    </Box>
                )}

                {/* Tweet Text */}
                <Typography
                    variant={variant === 'quoted' ? 'body2' : 'body1'}
                    sx={{
                        mb: (tweet.quoted_tweet || tweet.media_urls?.length) ? (variant === 'quoted' ? 1 : 2) : (variant === 'quoted' ? 0 : 1),
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: variant === 'quoted' ? 1.4 : 1.5,
                    }}
                >
                    {tweet.content}
                </Typography>

                {/* Quoted Tweet (if provided via render prop) */}
                {tweet.quoted_tweet && renderQuotedTweet && renderQuotedTweet(tweet.quoted_tweet)}

                {/* Media */}
                {showMedia && tweet.media_urls && tweet.media_urls.length > 0 && (
                    <Box sx={{
                        borderRadius: variant === 'quoted' ? 1.5 : 2,
                        overflow: 'hidden',
                        mb: variant === 'quoted' ? 0 : 2
                    }}>
                        <img
                            src={tweet.media_urls[0]}
                            alt="Tweet media"
                            style={{
                                width: '100%',
                                maxHeight: maxMediaHeight,
                                objectFit: 'cover',
                            }}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}

