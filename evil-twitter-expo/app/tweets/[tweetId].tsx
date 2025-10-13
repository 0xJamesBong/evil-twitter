import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTweetsStore, Tweet } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { WeaponSelectionModal } from '@/components/WeaponSelectionModal';
import { QuoteModal } from '@/components/QuoteModal';
import { ReplyThreadModal } from '@/components/ReplyThreadModal';

export default function TweetPage() {
    const { tweetId } = useLocalSearchParams<{ tweetId: string }>();
    const { fetchTweet, fetchThread, threads, threadLoading, threadError } = useTweetsStore();
    const { user: currentUser } = useBackendUserStore();

    const [tweet, setTweet] = useState<Tweet | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showWeaponModal, setShowWeaponModal] = useState(false);
    const [weaponActionType, setWeaponActionType] = useState<'attack' | 'heal'>('attack');

    const loadTweet = async () => {
        if (!tweetId) return;

        setLoading(true);
        try {
            const tweetData = await fetchTweet(tweetId);
            if (tweetData) {
                setTweet(tweetData);
                // Also fetch the thread if this tweet has replies
                if (tweetData.replies_count > 0) {
                    await fetchThread(tweetId);
                }
            }
        } catch (error) {
            console.error('Failed to load tweet:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTweet();
        setRefreshing(false);
    };

    useEffect(() => {
        loadTweet();
    }, [tweetId]);

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
        if (!currentUser?._id?.$oid || !tweet) return;
        // Implementation would go here
        Alert.alert('Info', 'Retweet functionality');
    };

    const handleQuote = () => {
        // Implementation would go here
        Alert.alert('Info', 'Quote functionality');
    };

    const handleReply = () => {
        // Implementation would go here
        Alert.alert('Info', 'Reply functionality');
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
        // Implementation would go here
        Alert.alert('Info', `Weapon selected: ${weaponActionType}`);
    };

    const renderTweet = (tweetData: Tweet, isReply = false) => (
        <View key={tweetData._id.$oid} style={[styles.tweetContainer, isReply && styles.replyContainer]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {tweetData.author_display_name?.charAt(0).toUpperCase() ||
                            tweetData.author_username?.charAt(0).toUpperCase() || '😈'}
                    </Text>
                </View>
                <View style={styles.tweetContent}>
                    <View style={styles.tweetHeader}>
                        <Text style={styles.displayName}>
                            {tweetData.author_display_name || tweetData.author_username || 'User'}
                        </Text>
                        <Text style={styles.username}>@{tweetData.author_username || 'user'}</Text>
                        <Text style={styles.time}>· {formatTime(tweetData.created_at)}</Text>
                    </View>

                    {/* Replying to indicator */}
                    {tweetData.tweet_type === 'reply' && tweetData.replied_to_tweet && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Replying to <Text style={styles.replyingToUsername}>@{tweetData.replied_to_tweet?.author_username || 'user'}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Quoting indicator */}
                    {tweetData.tweet_type === 'quote' && tweetData.quoted_tweet && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Quoting <Text style={styles.replyingToUsername}>@{tweetData.quoted_tweet?.author_username || 'user'}</Text>
                            </Text>
                        </View>
                    )}

                    {/* Tweet Content */}
                    <Text style={styles.tweetText}>{tweetData.content}</Text>

                    {/* Quoted Tweet */}
                    {tweetData.quoted_tweet && (
                        <View style={styles.quotedCard}>
                            <View style={styles.quotedHeader}>
                                <View style={styles.quotedAvatar}>
                                    <Text style={styles.quotedAvatarText}>
                                        {tweetData.quoted_tweet?.author_display_name?.charAt(0).toUpperCase() ||
                                            tweetData.quoted_tweet?.author_username?.charAt(0).toUpperCase() || '😈'}
                                    </Text>
                                </View>
                                <View style={styles.quotedInfo}>
                                    <Text style={styles.quotedName}>
                                        {tweetData.quoted_tweet?.author_display_name ||
                                            tweetData.quoted_tweet?.author_username || 'User'}
                                    </Text>
                                    <Text style={styles.quotedUsername}>@{tweetData.quoted_tweet?.author_username || 'user'}</Text>
                                </View>
                            </View>
                            <Text style={styles.quotedText}>{tweetData.quoted_tweet.content}</Text>
                        </View>
                    )}

                    {/* Health Bar */}
                    <View style={styles.healthContainer}>
                        <View style={styles.healthBar}>
                            <View
                                style={[
                                    styles.healthFill,
                                    {
                                        width: `${(tweetData.health.current / tweetData.max_health) * 100}%`,
                                        backgroundColor: getHealthColor(tweetData.health.current, tweetData.max_health)
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.healthText}>
                            {tweetData.health.current}/{tweetData.max_health} HP
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
                            <Text style={styles.actionIcon}>💬</Text>
                            <Text style={styles.actionText}>{tweetData.replies_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleRetweet}>
                            <Text style={styles.actionIcon}>🔄</Text>
                            <Text style={styles.actionText}>{tweetData.retweets_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleQuote}>
                            <Text style={styles.actionIcon}>💬</Text>
                            <Text style={styles.actionText}>{tweetData.quote_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionIcon}>❤️</Text>
                            <Text style={styles.actionText}>{tweetData.likes_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleAttack}>
                            <Text style={styles.actionIcon}>⚔️</Text>
                            <Text style={styles.actionText}>Attack</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleHeal}>
                            <Text style={styles.actionIcon}>💚</Text>
                            <Text style={styles.actionText}>Heal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1DA1F2" />
                <Text style={styles.loadingText}>Loading tweet...</Text>
            </View>
        );
    }

    if (!tweet) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Tweet not found</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadTweet}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const threadTweets = threads[tweetId] || [];
    const replies = threadTweets.filter(t => t.tweet_type === 'reply' && t.replied_to_tweet_id?.$oid === tweetId);

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Main Tweet */}
            {renderTweet(tweet)}

            {/* Replies */}
            {replies.length > 0 && (
                <View style={styles.repliesSection}>
                    <Text style={styles.repliesHeader}>
                        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </Text>
                    {replies.map(reply => renderTweet(reply, true))}
                </View>
            )}

            {/* Loading indicator for thread */}
            {threadLoading && (
                <View style={styles.threadLoading}>
                    <ActivityIndicator size="small" color="#1DA1F2" />
                    <Text style={styles.threadLoadingText}>Loading replies...</Text>
                </View>
            )}

            {/* Error state for thread */}
            {threadError && (
                <View style={styles.threadError}>
                    <Text style={styles.threadErrorText}>{threadError}</Text>
                </View>
            )}

            <WeaponSelectionModal
                visible={showWeaponModal}
                onClose={() => setShowWeaponModal(false)}
                onSelectWeapon={handleWeaponSelect}
                actionType={weaponActionType}
            />
            <QuoteModal />
            <ReplyThreadModal />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    errorText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
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
    repliesSection: {
        marginTop: 8,
    },
    repliesHeader: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#16181c',
    },
    threadLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    threadLoadingText: {
        color: '#71767b',
        marginLeft: 8,
    },
    threadError: {
        padding: 16,
        alignItems: 'center',
    },
    threadErrorText: {
        color: '#F44336',
        textAlign: 'center',
    },
});
