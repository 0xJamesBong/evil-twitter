'use client';

import React from 'react';
import {
    Box,
    TextField,
    Button,
    Avatar,
    Alert,
    CircularProgress,
} from '@mui/material';
import { useComposeStore } from '../lib/stores/composeStore';
import { useBackendUserStore } from '../lib/stores/backendUserStore';
import { TweetMediaToolbar } from './tweets';

export function ComposeTweet() {
    const {
        content,
        isSubmitting,
        error,
        remainingChars,
        isOverLimit,
        setContent,
        submitTweet,
    } = useComposeStore();

    const { user: currentUser } = useBackendUserStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitTweet();
    };

    return (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {/* Avatar */}
                    <Avatar
                        src={currentUser?.avatar_url || undefined}
                        sx={{ width: 48, height: 48 }}
                    >
                        {currentUser?.display_name?.charAt(0).toUpperCase() || '😈'}
                    </Avatar>

                    {/* Tweet Input */}
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's happening?"
                            multiline
                            rows={3}
                            fullWidth
                            variant="standard"
                            inputProps={{ maxLength: 280 }}
                            sx={{
                                '& .MuiInput-root:before': { display: 'none' },
                                '& .MuiInput-root:after': { display: 'none' },
                                '& .MuiInputBase-input': {
                                    fontSize: '1.25rem',
                                    lineHeight: 1.5,
                                }
                            }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {error}
                            </Alert>
                        )}

                        {/* Actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <TweetMediaToolbar />

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={!content.trim() || isOverLimit || isSubmitting}
                                sx={{ minWidth: 80 }}
                                startIcon={isSubmitting && <CircularProgress size={16} />}
                            >
                                {isSubmitting ? 'Posting...' : `Post ${content.length > 0 ? `(${content.length}/280)` : ''}`}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </form>
        </Box>
    );
}