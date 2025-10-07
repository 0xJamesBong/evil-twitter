'use client';

import React from 'react';
import {
    Box,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Image as ImageIcon,
    Gif as GifIcon,
    Poll as PollIcon,
    SentimentSatisfied as EmojiIcon,
    Schedule as ScheduleIcon,
    LocationOn as LocationIcon,
} from '@mui/icons-material';

interface TweetMediaToolbarProps {
    sx?: any;
}

export function TweetMediaToolbar({ sx }: TweetMediaToolbarProps) {
    return (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ...sx }}>
            <Tooltip title="Media" arrow>
                <IconButton size="small" color="primary">
                    <ImageIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="GIF" arrow>
                <IconButton size="small" color="primary">
                    <GifIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="Poll" arrow>
                <IconButton size="small" color="primary">
                    <PollIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="Emoji" arrow>
                <IconButton size="small" color="primary">
                    <EmojiIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="Schedule" arrow>
                <IconButton size="small" color="primary">
                    <ScheduleIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Tooltip title="Location" arrow>
                <IconButton size="small" color="primary">
                    <LocationIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    );
}

