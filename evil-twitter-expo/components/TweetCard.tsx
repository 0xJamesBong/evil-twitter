import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WeaponSelectionModal } from './WeaponSelectionModal';
import { QuoteModal } from './QuoteModal';
import { ReplyThreadModal } from './ReplyThreadModal';
import { ThreadModal } from './ThreadModal';

interface TweetCardProps {
    tweet: Tweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
    const { user: currentUser } = useBackendUserStore();
    const { retweetTweet, attackTweet, healTweet, openQuoteModal, openReplyModal, fetchThread, openReplyThreadModal } = useTweetsStore();
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

    const handleRetweet = async () => {
        if (!currentUser?._id?.$oid) return;

        const result = await retweetTweet(tweet._id.$oid, currentUser._id.$oid);
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
        openReplyThreadModal(tweet._id.$oid);
    };

    const handleAttack = () => {
        setWeaponActionType('attack');
        setShowWeaponModal(true);
    };

    const handleHeal = () => {
        setWeaponActionType('heal');
        setShowWeaponModal(true);
    };

    const handleWeaponSelect = (weaponId: string, damage: number, health: number) => {
        setShowWeaponModal(false);
        // Show amount input modal or use default amount
        handleActionWithWeapon(weaponId, damage, health);
    };

    const handleActionWithWeapon = async (weaponId: string, damage: number, health: number) => {
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

    const handleViewThread = () => {
        fetchThread(tweet._id.$oid);
    };

    const getHealthColor = (health: number, maxHealth: number) => {
        const percentage = health / maxHealth;
        if (percentage > 0.7) return '#4CAF50';
        if (percentage > 0.3) return '#FF9800';
        return '#F44336';
    };

    return (
        <>
            <View style={styles.container}>
                {/* Avatar */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {tweet.author?.display_name?.charAt(0).toUpperCase() || '😈'}
                    </Text>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.displayName}>{tweet.author?.display_name || 'User'}</Text>
                        <Text style={styles.username}>@{tweet.author?.username || 'user'}</Text>
                        <Text style={styles.time}>· {formatTime(tweet.created_at)}</Text>
                        <TouchableOpacity style={styles.moreButton}>
                            <Text style={styles.moreIcon}>⋯</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Replying to indicator */}
                    {tweet.tweet_type === 'reply' && tweet.replied_to_tweet && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Replying to <Text style={styles.replyingToUsername}>@{tweet.replied_to_tweet.author?.username || 'user'}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Quoting indicator */}
                    {tweet.tweet_type === 'quote' && tweet.quoted_tweet && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Quoting <Text style={styles.replyingToUsername}>@{tweet.quoted_tweet.author?.username || 'user'}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Tweet Content */}
                    <Text style={styles.tweetText}>{tweet.content}</Text>

                    {/* Health Bar */}
                    <View style={styles.healthContainer}>
                        <View style={styles.healthBar}>
                            <View
                                style={[
                                    styles.healthFill,
                                    {
                                        width: `${(tweet.health / tweet.max_health) * 100}%`,
                                        backgroundColor: getHealthColor(tweet.health, tweet.max_health)
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.healthText}>
                            {tweet.health}/{tweet.max_health} HP
                        </Text>
                    </View>

                    {/* Quoted Tweet */}
                    {tweet.quoted_tweet && (
                        <View style={styles.quotedCard}>
                            <View style={styles.quotedHeader}>
                                <View style={styles.quotedAvatar}>
                                    <Text style={styles.quotedAvatarText}>
                                        {tweet.quoted_tweet.author?.display_name?.charAt(0).toUpperCase() || '😈'}
                                    </Text>
                                </View>
                                <View style={styles.quotedInfo}>
                                    <Text style={styles.quotedName}>{tweet.quoted_tweet.author?.display_name || 'User'}</Text>
                                    <Text style={styles.quotedUsername}>@{tweet.quoted_tweet.author?.username || 'user'}</Text>
                                </View>
                            </View>
                            <Text style={styles.quotedText}>{tweet.quoted_tweet.content}</Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={tweet.reply_count > 0 ? handleViewThread : handleReply}
                        >
                            <Text style={styles.actionIcon}>💬</Text>
                            <Text style={styles.actionText}>
                                {tweet.reply_count > 0 ? `View ${tweet.reply_count} replies` : 'Reply'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleRetweet}
                        >
                            <Text style={styles.actionIcon}>🔄</Text>
                            <Text style={styles.actionText}>{tweet.retweet_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleQuote}
                        >
                            <Text style={styles.actionIcon}>💬</Text>
                            <Text style={styles.actionText}>{tweet.quote_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                        >
                            <Text style={styles.actionIcon}>❤️</Text>
                            <Text style={styles.actionText}>{tweet.like_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleAttack}
                        >
                            <Text style={styles.actionIcon}>⚔️</Text>
                            <Text style={styles.actionText}>Attack</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleHeal}
                        >
                            <Text style={styles.actionIcon}>💚</Text>
                            <Text style={styles.actionText}>Heal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <WeaponSelectionModal
                visible={showWeaponModal}
                onClose={() => setShowWeaponModal(false)}
                onSelectWeapon={handleWeaponSelect}
                actionType={weaponActionType}
            />
            <QuoteModal />
            <ReplyThreadModal />
            <ThreadModal />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
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
    content: {
        flex: 1,
    },
    header: {
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
        marginBottom: 4,
        marginLeft: 0,
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
    healthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#16181c',
        borderRadius: 8,
    },
    healthBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#2f3336',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 8,
    },
    healthFill: {
        height: '100%',
        borderRadius: 3,
    },
    healthText: {
        color: '#71767b',
        fontSize: 12,
        fontWeight: 'bold',
    },
    quotedCard: {
        backgroundColor: '#16181c',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2f3336',
        marginTop: 8,
        padding: 12,
    },
    quotedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    quotedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    quotedAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    quotedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quotedName: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 13,
        marginRight: 4,
    },
    quotedUsername: {
        color: '#71767b',
        fontSize: 13,
    },
    quotedText: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 4,
        maxWidth: 425,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        minWidth: 40,
    },
    actionIcon: {
        fontSize: 18,
        marginRight: 4,
    },
    actionText: {
        color: '#71767b',
        fontSize: 13,
    },
});
