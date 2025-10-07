'use client';

import React from 'react';
import {
    Card,
    CardContent,
    Box,
} from '@mui/material';
import { TweetContent, TweetData } from './TweetContent';

interface QuotedTweetCardProps {
    tweet: TweetData;
}

export function QuotedTweetCard({ tweet }: QuotedTweetCardProps) {
    return (
        <Card
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                mt: 0.5,
                mb: 0.5,
                backgroundColor: 'transparent',
                boxShadow: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }
            }}
        >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <TweetContent
                    tweet={tweet}
                    variant="quoted"
                    showHeader={true}
                    showMedia={true}
                />
            </CardContent>
        </Card>
    );
}

