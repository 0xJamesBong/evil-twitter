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
    Healing,
    LocalHospital,
} from '@mui/icons-material';
import { useTweetsStore } from '../lib/stores/tweetsStore';

interface Tweet {
    id: string | { $oid: string };
    content: string;
    tweet_type: "Original" | "Retweet" | "Quote" | "Reply";
    original_tweet_id?: string | { $oid: string };
    replied_to_tweet_id?: string | { $oid: string };
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
    health: number;
}

interface TweetCardProps {
    tweet: Tweet;
    onLike: (tweetId: string) => void;
    onRetweet: (tweetId: string) => void;
    onQuote: (tweetId: string, content: string) => void;
    onReply: (tweetId: string, content: string) => void;
}

export function TweetCard({ tweet, onLike, onRetweet, onQuote, onReply }: TweetCardProps) {
    const {
        showQuoteModal,
        quoteTweetId,
        quoteContent,
        openQuoteModal,
        closeQuoteModal,
        setQuoteContent,
        clearQuoteData,
        showReplyModal,
        replyTweetId,
        replyContent,
        openReplyModal,
        closeReplyModal,
        setReplyContent,
        clearReplyData,
        healTweet,
        attackTweet
    } = useTweetsStore();

    // Heal and Attack state
    const [showHealModal, setShowHealModal] = React.useState(false);
    const [showAttackModal, setShowAttackModal] = React.useState(false);
    const [healAmount, setHealAmount] = React.useState(10);
    const [attackAmount, setAttackAmount] = React.useState(10);

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

    const handleReply = () => {
        openReplyModal(getTweetId());
    };

    const handleReplySubmit = () => {
        if (replyContent.trim()) {
            onReply(getTweetId(), replyContent.trim());
            clearReplyData();
        }
    };

    const handleHeal = () => {
        setShowHealModal(true);
    };

    const handleAttack = () => {
        setShowAttackModal(true);
    };

    const handleHealSubmit = async () => {
        const result = await healTweet(getTweetId(), healAmount);
        if (result.success) {
            setShowHealModal(false);
            setHealAmount(10);
        } else {
            console.error('Failed to heal tweet:', result.error);
        }
    };

    const handleAttackSubmit = async () => {
        const result = await attackTweet(getTweetId(), attackAmount);
        if (result.success) {
            setShowAttackModal(false);
            setAttackAmount(10);
        } else {
            console.error('Failed to attack tweet:', result.error);
        }
    };

    const getTweetTypeColor = (type: string) => {
        switch (type) {
            case 'Retweet':
                return 'success';
            case 'Quote':
                return 'primary';
            case 'Reply':
                return 'info';
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
            case 'Reply':
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

                                {/* Health Display */}
                                <Box
                                    sx={{
                                        ml: 'auto',
                                        mr: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
                                    }}
                                >
                                    <Box
                                        sx={{
                                            backgroundColor: '#ff69b4', // Pink color
                                            color: 'white',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 2,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            minWidth: '40px',
                                            textAlign: 'center',
                                            boxShadow: '0 2px 4px rgba(255, 105, 180, 0.3)'
                                        }}
                                    >
                                        {tweet.health}
                                    </Box>
                                    <IconButton size="small">
                                        <MoreHoriz fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Tweet Type Indicator */}
                            {tweet.tweet_type !== 'Original' && (
                                <Box sx={{ mb: 1 }}>
                                    <Chip
                                        icon={getTweetTypeIcon(tweet.tweet_type)}
                                        label={
                                            tweet.tweet_type === 'Retweet' ? 'Retweeted' :
                                                tweet.tweet_type === 'Quote' ? 'Quoted' :
                                                    tweet.tweet_type === 'Reply' ? 'Replied' : 'Tweet'
                                        }
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
                                <IconButton
                                    size="small"
                                    color="default"
                                    onClick={handleReply}
                                >
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

                                {/* Heal */}
                                <IconButton
                                    size="small"
                                    color="success"
                                    onClick={handleHeal}
                                    disabled={tweet.health >= 100}
                                >
                                    <Healing fontSize="small" />
                                </IconButton>

                                {/* Attack */}
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={handleAttack}
                                    disabled={tweet.health <= 0}
                                >
                                    <LocalHospital fontSize="small" />
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

            {/* Reply Tweet Modal */}
            <Dialog
                open={showReplyModal && replyTweetId === getTweetId()}
                onClose={closeReplyModal}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Reply to Tweet</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        placeholder="Tweet your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        inputProps={{ maxLength: 280 }}
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {replyContent.length}/280
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReplyModal}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleReplySubmit}
                        variant="contained"
                        disabled={!replyContent.trim()}
                    >
                        Reply
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Heal Tweet Modal */}
            <Dialog
                open={showHealModal}
                onClose={() => setShowHealModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Heal Tweet</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Current health: {tweet.health}/100
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="outlined"
                        label="Heal Amount"
                        type="number"
                        value={healAmount}
                        onChange={(e) => setHealAmount(parseInt(e.target.value) || 0)}
                        inputProps={{ min: 1, max: 100 }}
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Amount must be between 1 and 100
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowHealModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleHealSubmit}
                        variant="contained"
                        color="success"
                        disabled={healAmount < 1 || healAmount > 100 || tweet.health >= 100}
                    >
                        Heal Tweet
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Attack Tweet Modal */}
            <Dialog
                open={showAttackModal}
                onClose={() => setShowAttackModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Attack Tweet</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Current health: {tweet.health}/100
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="outlined"
                        label="Attack Amount"
                        type="number"
                        value={attackAmount}
                        onChange={(e) => setAttackAmount(parseInt(e.target.value) || 0)}
                        inputProps={{ min: 1, max: 100 }}
                        sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Amount must be between 1 and 100
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAttackModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAttackSubmit}
                        variant="contained"
                        color="error"
                        disabled={attackAmount < 1 || attackAmount > 100 || tweet.health <= 0}
                    >
                        Attack Tweet
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}