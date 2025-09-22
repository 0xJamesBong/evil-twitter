'use client';

import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Paper,
    AppBar,
    Toolbar,
    Stack,
} from '@mui/material';
import { ComposeTweet } from './ComposeTweet';
import { TweetCard } from './TweetCard';
import { useAuthStore } from '../lib/stores/authStore';
import { useTweetsStore } from '../lib/stores/tweetsStore';
import { useBackendUserStore } from '../lib/stores/backendUserStore';

export function Timeline() {
    const { isAuthenticated } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();
    const {
        tweets,
        isLoading,
        error,
        fetchTweets,
        fetchUserWall,
        likeTweet,
        retweetTweet,
        quoteTweet,
        replyTweet,
        generateFakeTweets
    } = useTweetsStore();

    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchUserWall(backendUser._id.$oid);
        } else if (isAuthenticated) {
            // Fallback to fetchTweets if backend user is not available yet
            fetchTweets();
        }
    }, [fetchUserWall, fetchTweets, backendUser, isAuthenticated]);

    if (isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="400px"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert
                    severity="error"
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => {
                                if (backendUser?._id?.$oid) {
                                    fetchUserWall(backendUser._id.$oid);
                                } else {
                                    fetchTweets();
                                }
                            }}
                        >
                            Try Again
                        </Button>
                    }
                >
                    Error: {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
            {/* Header */}
            <AppBar
                position="sticky"
                sx={{
                    backgroundColor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none'
                }}
            >
                <Toolbar>
                    <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
                        Home
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* Compose Tweet */}
            {isAuthenticated ? (
                <Paper
                    variant="outlined"
                    sx={{
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderRadius: 0,
                        borderColor: 'divider'
                    }}
                >
                    <ComposeTweet />
                </Paper>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderRadius: 0,
                        borderColor: 'divider',
                        p: 4,
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                        Welcome to Evil Twitter
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Sign in to see tweets and join the conversation!
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        href="/login"
                        sx={{ borderRadius: '9999px', px: 4 }}
                    >
                        Sign In
                    </Button>
                </Paper>
            )}

            {/* Tweets */}
            <Box>
                {tweets.length === 0 ? (
                    <Paper
                        variant="outlined"
                        sx={{
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderRadius: 0,
                            borderColor: 'divider',
                            p: 4,
                            textAlign: 'center'
                        }}
                    >
                        <Typography variant="body1" color="text.secondary" paragraph>
                            {isAuthenticated ? 'No tweets yet. Be the first to tweet!' : 'Sign in to see tweets'}
                        </Typography>
                        {isAuthenticated && (
                            <Button
                                variant="outlined"
                                color="warning"
                                onClick={() => generateFakeTweets()}
                                sx={{ borderRadius: '9999px' }}
                            >
                                Generate Sample Tweets
                            </Button>
                        )}
                    </Paper>
                ) : (
                    <Stack spacing={0}>
                        {tweets.map((tweet, index) => {
                            // Handle MongoDB ObjectId format - extract the actual ID string
                            const tweetId = typeof tweet.id === 'string'
                                ? tweet.id
                                : tweet.id?.$oid || `tweet-${index}`;

                            return (
                                <Box key={tweetId} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <TweetCard
                                        tweet={tweet}
                                        onLike={() => likeTweet(tweetId)}
                                        onRetweet={() => retweetTweet(tweetId)}
                                        onQuote={(tweetId, content) => quoteTweet(tweetId, content)}
                                        onReply={(tweetId, content) => replyTweet(tweetId, content)}
                                    />
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
