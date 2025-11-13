import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import { AppText } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { QuoteModal } from './QuoteModal';
import { ReplyThreadModal } from './ReplyThreadModal';

interface TweetComponentProps {
    tweet: Tweet;
    isReply?: boolean;
    isClickable?: boolean;
    onPress?: () => void;
    showActions?: boolean;
}

export function TweetComponent({
    tweet,
    isReply = false,
    isClickable = true,
    onPress,
    showActions = true,
}: TweetComponentProps) {
    const { user: currentUser } = useBackendUserStore();
    const {
        retweetTweet,
        // attackTweet,
        // supportTweet,
        smackTweet,
        likeTweet,
        openQuoteModal,
        openReplyModal
    } = useTweetsStore();

    const isRetweet = tweet.tweet_type === 'retweet' && !!tweet.quoted_tweet;
    const displayTweet = isRetweet ? tweet.quoted_tweet! : tweet;
    const displayOwnerId = displayTweet.owner_id.$oid;
    const displayName =
        displayTweet.author_display_name || displayTweet.author_username || 'User';
    const displayUsername = displayTweet.author_username || 'user';
    const avatarInitial =
        (displayName || displayUsername || '😈').charAt(0).toUpperCase() || '😈';
    const retweeterName =
        tweet.author_display_name || tweet.author_username || 'Someone';

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'now';
        if (diffInHours < 24) return `${diffInHours}h`;
        return date.toLocaleDateString();
    };

    const getEnergyColor = (energy: number) => {
        if (energy >= 0) {
            if (energy > 500) return '#4CAF50';
            if (energy > 250) return '#8BC34A';
            if (energy > 100) return '#CDDC39';
            return '#FFC107';
        }
        return '#F44336';
    };

    const handleRetweet = async () => {
        if (!currentUser?._id?.$oid) return;

        const result = await retweetTweet(tweet._id.$oid);
        if (result.success) {
            Alert.alert('Success', 'Tweet retweeted!');
        } else {
            Alert.alert('Error', result.error || 'Failed to retweet');
        }
    };

    const handleQuote = () => {
        openQuoteModal(tweet._id.$oid);
    };

    const handleReply = () => {
        openReplyModal(tweet._id.$oid);
    };

    const handleLike = async () => {
        const result = await likeTweet(tweet._id.$oid);
        if (!result.success) {
            Alert.alert('Error', result.error || 'Failed to like tweet');
        }
    };

    const handleSmack = async () => {
        const result = await smackTweet(tweet._id.$oid);
        if (result.success) {
            Alert.alert('Success', 'Tweet smacked!');
        } else {
            Alert.alert('Error', result.error || 'Failed to smack tweet. Make sure you have enough BLING tokens.');
        }
    };


    const handleTweetPress = () => {
        if (isClickable && onPress) {
            onPress();
        } else if (isClickable) {
            router.push(`/tweets/${tweet._id.$oid}`);
        }
    };

    const TweetContent = () => (
        <View style={[styles.tweetContainer, isReply && styles.replyContainer]}>
            {isRetweet && (
                <View style={styles.retweetBanner}>
                    <AppText variant="small" color="accent">🔁</AppText>
                    <AppText variant="small" color="accent" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{retweeterName} retweeted</AppText>
                </View>
            )}
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.avatar}
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent tweet click when clicking avatar
                        router.push(`/profile/${displayOwnerId}`);
                    }}
                >
                    <AppText variant="h4">
                        {avatarInitial}
                    </AppText>
                </TouchableOpacity>
                <View style={styles.tweetContent}>
                    <View style={styles.tweetHeader}>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation(); // Prevent tweet click when clicking name
                                router.push(`/profile/${displayOwnerId}`);
                            }}
                        >
                            <AppText variant="bodyBold">
                                {displayName}
                            </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation(); // Prevent tweet click when clicking username
                                router.push(`/profile/${displayOwnerId}`);
                            }}
                        >
                            <AppText variant="body" color="secondary">@{displayUsername}</AppText>
                        </TouchableOpacity>
                        <AppText variant="body" color="secondary">· {formatTime(tweet.created_at)}</AppText>
                        {!isReply && (
                            <TouchableOpacity style={styles.moreButton}>
                                <AppText variant="h4" color="secondary">⋯</AppText>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Replying to indicator */}
                    {displayTweet.tweet_type === 'reply' && displayTweet.replied_to_tweet && (
                        <View style={styles.replyingToContainer}>
                            <AppText variant="caption" color="secondary">
                                Replying to{' '}
                            </AppText>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation(); // Prevent tweet click when clicking username
                                    router.push(`/profile/${displayTweet.replied_to_tweet?.owner_id.$oid}`);
                                }}
                            >
                                <AppText variant="caption" color="accent" style={{ fontWeight: '500' }}>@{displayTweet.replied_to_tweet?.author_username || 'user'}</AppText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Quoting indicator */}
                    {!isRetweet && tweet.tweet_type === 'quote' && tweet.quoted_tweet && (
                        <View style={styles.replyingToContainer}>
                            <AppText variant="caption" color="secondary">
                                Quoting{' '}
                            </AppText>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation(); // Prevent tweet click when clicking username
                                    router.push(`/profile/${tweet.quoted_tweet?.owner_id.$oid}`);
                                }}
                            >
                                <AppText variant="caption" color="accent" style={{ fontWeight: '500' }}>@{tweet.quoted_tweet?.author_username || 'user'}</AppText>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tweet Content */}
                    <AppText variant="body">{displayTweet.content}</AppText>

                    {/* Quoted Tweet */}
                    {!isRetweet && tweet.quoted_tweet && (
                        <View style={styles.quotedCard}>
                            <View style={styles.quotedHeader}>
                                <TouchableOpacity
                                    style={styles.quotedAvatar}
                                    onPress={(e) => {
                                        e.stopPropagation(); // Prevent tweet click when clicking avatar
                                        router.push(`/profile/${tweet.quoted_tweet?.owner_id.$oid}`);
                                    }}
                                >
                                    <AppText variant="captionBold">
                                        {tweet.quoted_tweet?.author_display_name?.charAt(0).toUpperCase() ||
                                            tweet.quoted_tweet?.author_username?.charAt(0).toUpperCase() || '😈'}
                                    </AppText>
                                </TouchableOpacity>
                                <View style={styles.quotedInfo}>
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation(); // Prevent tweet click when clicking name
                                            router.push(`/profile/${tweet.quoted_tweet?.owner_id.$oid}`);
                                        }}
                                    >
                                        <AppText variant="captionBold">
                                            {tweet.quoted_tweet?.author_display_name ||
                                                tweet.quoted_tweet?.author_username || 'User'}
                                        </AppText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={(e) => {
                                            e.stopPropagation(); // Prevent tweet click when clicking username
                                            router.push(`/profile/${tweet.quoted_tweet?.owner_id.$oid}`);
                                        }}
                                    >
                                        <AppText variant="caption" color="tertiary">@{tweet.quoted_tweet?.author_username || 'user'}</AppText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <AppText variant="caption">{tweet.quoted_tweet.content}</AppText>
                        </View>
                    )}

                    {/* Energy Overview */}
                    <View style={styles.energyContainer}>
                        <AppText variant="small" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Energy</AppText>
                        <AppText
                            variant="h3"
                            style={{ color: getEnergyColor(tweet.energy_state.energy) }}
                        >
                            {tweet.energy_state.energy.toFixed(1)} J
                        </AppText>
                        <View style={styles.energyBreakdownRow}>
                            <AppText variant="small" color="tertiary">
                                Kinetic: {tweet.energy_state.kinetic_energy.toFixed(1)} J
                            </AppText>
                            <AppText variant="small" color="tertiary">
                                Potential: {tweet.energy_state.potential_energy.toFixed(1)} J
                            </AppText>
                        </View>
                        <View style={styles.energyBreakdownRow}>
                            <AppText variant="small" style={{ color: colors.energySupport }}>
                                Support +{tweet.energy_state.energy_gained_from_support.toFixed(1)} J
                            </AppText>
                            <AppText variant="small" style={{ color: colors.energyAttack }}>
                                Damage -{tweet.energy_state.energy_lost_from_attacks.toFixed(1)} J
                            </AppText>
                        </View>
                    </View>

                    {/* Actions */}
                    {showActions && (
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleReply();
                                }}
                            >
                                <AppText variant="caption" style={{ fontSize: 16, marginRight: spacing.xs }}>💬</AppText>
                                <AppText variant="caption" color="secondary" style={{ fontWeight: '500' }}>{tweet.replies_count || 0}</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleRetweet();
                                }}
                            >
                                <AppText variant="caption" style={{ fontSize: 16, marginRight: spacing.xs }}>🔄</AppText>
                                <AppText variant="caption" color="secondary" style={{ fontWeight: '500' }}>{tweet.retweets_count || 0}</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleQuote();
                                }}
                            >
                                <AppText variant="caption" style={{ fontSize: 16, marginRight: spacing.xs }}>💬</AppText>
                                <AppText variant="caption" color="secondary" style={{ fontWeight: '500' }}>{tweet.quote_count || 0}</AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleLike();
                                }}
                            >
                                <AppText
                                    variant="caption"
                                    style={{
                                        fontSize: 16,
                                        marginRight: spacing.xs,
                                        color: tweet.viewer_context?.is_liked ? colors.likeActive : colors.textSecondary
                                    }}
                                >
                                    ❤️
                                </AppText>
                                <AppText
                                    variant="caption"
                                    style={{
                                        fontWeight: '500',
                                        color: tweet.viewer_context?.is_liked ? colors.likeActive : colors.textSecondary
                                    }}
                                >
                                    {tweet.likes_count || 0}
                                </AppText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleSmack();
                                }}
                            >
                                <AppText variant="caption" style={{ fontSize: 16, marginRight: spacing.xs }}>👊</AppText>
                                <AppText variant="caption" color="secondary" style={{ fontWeight: '500' }}>{tweet.metrics?.smacks || 0}</AppText>
                            </TouchableOpacity>

                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <>
            {isClickable ? (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleTweetPress}
                >
                    <TweetContent />
                </TouchableOpacity>
            ) : (
                <TweetContent />
            )}

            {showActions && (
                <>
                    <QuoteModal />
                    <ReplyThreadModal />
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    tweetContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    replyContainer: {
        marginLeft: 20,
        borderLeftWidth: 2,
        borderLeftColor: colors.border,
        paddingLeft: spacing.lg,
    },
    retweetBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
        marginLeft: 60,
    },
    header: {
        flexDirection: 'row',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    tweetContent: {
        flex: 1,
    },
    tweetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.xs,
    },
    moreButton: {
        marginLeft: 'auto',
        padding: spacing.sm,
        borderRadius: radii.pill,
    },
    replyingToContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    quotedCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quotedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    quotedAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    quotedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    energyContainer: {
        marginBottom: spacing.md,
        backgroundColor: colors.energyBg,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
    },
    energyBreakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
    },
});
