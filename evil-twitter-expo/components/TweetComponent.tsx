import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import { WeaponSelectionModal } from './WeaponSelectionModal';
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
        attackTweet,
        healTweet,
        openQuoteModal,
        openReplyModal
    } = useTweetsStore();

    const [showWeaponModal, setShowWeaponModal] = useState(false);
    const [weaponActionType, setWeaponActionType] = useState<'attack' | 'heal'>('attack');

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'now';
        if (diffInHours < 24) return `${diffInHours}h`;
        return date.toLocaleDateString();
    };

    const getHealthColor = (health: number, maxHealth: number) => {
        const percentage = health / maxHealth;
        if (percentage > 0.7) return '#4CAF50';
        if (percentage > 0.3) return '#FF9800';
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

    const handleAttack = () => {
        setWeaponActionType('attack');
        setShowWeaponModal(true);
    };

    const handleHeal = () => {
        setWeaponActionType('heal');
        setShowWeaponModal(true);
    };

    const handleWeaponSelect = async (weaponId: string, damage: number, health: number) => {
        setShowWeaponModal(false);
        const actionAmount = weaponActionType === 'attack' ? damage : health;
        const result = weaponActionType === 'attack'
            ? await attackTweet(tweet._id.$oid, actionAmount)
            : await healTweet(tweet._id.$oid, actionAmount);

        if (result.success) {
            Alert.alert('Success', `Tweet ${weaponActionType}ed!`);
        } else {
            Alert.alert('Error', result.error || `Failed to ${weaponActionType} tweet`);
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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {tweet.author_display_name?.charAt(0).toUpperCase() ||
                            tweet.author_username?.charAt(0).toUpperCase() || '😈'}
                    </Text>
                </View>
                <View style={styles.tweetContent}>
                    <View style={styles.tweetHeader}>
                        <Text style={styles.displayName}>
                            {tweet.author_display_name || tweet.author_username || 'User'}
                        </Text>
                        <Text style={styles.username}>@{tweet.author_username || 'user'}</Text>
                        <Text style={styles.time}>· {formatTime(tweet.created_at)}</Text>
                        {!isReply && (
                            <TouchableOpacity style={styles.moreButton}>
                                <Text style={styles.moreIcon}>⋯</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Replying to indicator */}
                    {tweet.tweet_type === 'reply' && tweet.replied_to_tweet && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Replying to <Text style={styles.replyingToUsername}>@{tweet.replied_to_tweet?.author_username || 'user'}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Quoting indicator */}
                    {tweet.tweet_type === 'quote' && tweet.quoted_tweet && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Quoting <Text style={styles.replyingToUsername}>@{tweet.quoted_tweet?.author_username || 'user'}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Tweet Content */}
                    <Text style={styles.tweetText}>{tweet.content}</Text>

                    {/* Quoted Tweet */}
                    {tweet.quoted_tweet && (
                        <View style={styles.quotedCard}>
                            <View style={styles.quotedHeader}>
                                <View style={styles.quotedAvatar}>
                                    <Text style={styles.quotedAvatarText}>
                                        {tweet.quoted_tweet?.author_display_name?.charAt(0).toUpperCase() ||
                                            tweet.quoted_tweet?.author_username?.charAt(0).toUpperCase() || '😈'}
                                    </Text>
                                </View>
                                <View style={styles.quotedInfo}>
                                    <Text style={styles.quotedName}>
                                        {tweet.quoted_tweet?.author_display_name ||
                                            tweet.quoted_tweet?.author_username || 'User'}
                                    </Text>
                                    <Text style={styles.quotedUsername}>@{tweet.quoted_tweet?.author_username || 'user'}</Text>
                                </View>
                            </View>
                            <Text style={styles.quotedText}>{tweet.quoted_tweet.content}</Text>
                        </View>
                    )}

                    {/* Health Bar */}
                    <View style={styles.healthContainer}>
                        <View style={styles.healthBar}>
                            <View
                                style={[
                                    styles.healthFill,
                                    {
                                        width: `${(tweet.health.current / tweet.max_health) * 100}%`,
                                        backgroundColor: getHealthColor(tweet.health.current, tweet.max_health)
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.healthText}>
                            {tweet.health.current}/{tweet.max_health} HP
                        </Text>
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
                                <Text style={styles.actionIcon}>💬</Text>
                                <Text style={styles.actionText}>{tweet.replies_count || 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleRetweet();
                                }}
                            >
                                <Text style={styles.actionIcon}>🔄</Text>
                                <Text style={styles.actionText}>{tweet.retweets_count || 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleQuote();
                                }}
                            >
                                <Text style={styles.actionIcon}>💬</Text>
                                <Text style={styles.actionText}>{tweet.quote_count || 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => e.stopPropagation()}
                            >
                                <Text style={styles.actionIcon}>❤️</Text>
                                <Text style={styles.actionText}>{tweet.likes_count || 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleAttack();
                                }}
                            >
                                <Text style={styles.actionIcon}>⚔️</Text>
                                <Text style={styles.actionText}>Attack</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleHeal();
                                }}
                            >
                                <Text style={styles.actionIcon}>💚</Text>
                                <Text style={styles.actionText}>Heal</Text>
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
                    <WeaponSelectionModal
                        visible={showWeaponModal}
                        onClose={() => setShowWeaponModal(false)}
                        onSelectWeapon={handleWeaponSelect}
                        actionType={weaponActionType}
                    />
                    <QuoteModal />
                    <ReplyThreadModal />
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    tweetContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    replyContainer: {
        marginLeft: 20,
        borderLeftWidth: 2,
        borderLeftColor: '#2f3336',
        paddingLeft: 16,
    },
    header: {
        flexDirection: 'row',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    tweetContent: {
        flex: 1,
    },
    tweetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    displayName: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 15,
        marginRight: 4,
    },
    username: {
        color: '#71767b',
        fontSize: 15,
        marginRight: 4,
    },
    time: {
        color: '#71767b',
        fontSize: 15,
    },
    moreButton: {
        marginLeft: 'auto',
        padding: 8,
        borderRadius: 20,
    },
    moreIcon: {
        color: '#71767b',
        fontSize: 18,
    },
    replyingToContainer: {
        marginBottom: 8,
    },
    replyingToText: {
        color: '#71767b',
        fontSize: 13,
    },
    replyingToUsername: {
        color: '#1DA1F2',
        fontWeight: '500',
    },
    tweetText: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 12,
    },
    quotedCard: {
        backgroundColor: '#16181c',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2f3336',
    },
    quotedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    quotedAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#555',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    quotedAvatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    quotedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quotedName: {
        color: '#fff',
        fontWeight: 'bold',
        marginRight: 4,
    },
    quotedUsername: {
        color: '#888',
    },
    quotedText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 18,
    },
    healthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    healthBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#2f3336',
        borderRadius: 4,
        marginRight: 8,
        overflow: 'hidden',
    },
    healthFill: {
        height: '100%',
        borderRadius: 4,
    },
    healthText: {
        color: '#71767b',
        fontSize: 12,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#2f3336',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    actionIcon: {
        fontSize: 16,
        marginRight: 4,
    },
    actionText: {
        color: '#71767b',
        fontSize: 13,
        fontWeight: '500',
    },
});
