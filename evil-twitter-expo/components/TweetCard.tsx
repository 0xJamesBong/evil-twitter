import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Card, Avatar, Text, Menu, Divider } from 'react-native-paper';
import { Tweet } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';

interface TweetCardProps {
    tweet: Tweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
    const { user: currentUser } = useBackendUserStore();
    const { retweetTweet, quoteTweet, replyTweet, attackTweet, healTweet } = useTweetsStore();
    const { weapons } = useWeaponsStore();
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [showWeaponMenu, setShowWeaponMenu] = useState(false);

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
        setShowQuoteModal(true);
    };

    const handleReply = () => {
        setShowReplyModal(true);
    };

    const handleAttack = async (weaponId: string) => {
        const result = await attackTweet(tweet._id.$oid, weaponId);
        if (result.success) {
            Alert.alert('Success', 'Tweet attacked!');
        } else {
            Alert.alert('Error', result.error || 'Failed to attack tweet');
        }
        setShowWeaponMenu(false);
    };

    const handleHeal = async (weaponId: string) => {
        const result = await healTweet(tweet._id.$oid, weaponId);
        if (result.success) {
            Alert.alert('Success', 'Tweet healed!');
        } else {
            Alert.alert('Error', result.error || 'Failed to heal tweet');
        }
        setShowWeaponMenu(false);
    };

    const getHealthColor = (health: number, maxHealth: number) => {
        const percentage = health / maxHealth;
        if (percentage > 0.7) return '#4CAF50';
        if (percentage > 0.3) return '#FF9800';
        return '#F44336';
    };

    return (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.container}>
                    {/* Avatar */}
                    <Avatar.Text
                        size={48}
                        label={tweet.author?.display_name?.charAt(0).toUpperCase() || '😈'}
                        style={styles.avatar}
                    />

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.displayName}>{tweet.author?.display_name || 'User'}</Text>
                            <Text style={styles.username}>@{tweet.author?.username || 'user'}</Text>
                            <Text style={styles.time}>· {formatTime(tweet.created_at)}</Text>
                        </View>

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
                            <Card style={styles.quotedCard}>
                                <Card.Content>
                                    <View style={styles.quotedHeader}>
                                        <Avatar.Text
                                            size={32}
                                            label={tweet.quoted_tweet.author?.display_name?.charAt(0).toUpperCase() || '😈'}
                                            style={styles.quotedAvatar}
                                        />
                                        <View style={styles.quotedInfo}>
                                            <Text style={styles.quotedName}>{tweet.quoted_tweet.author?.display_name || 'User'}</Text>
                                            <Text style={styles.quotedUsername}>@{tweet.quoted_tweet.author?.username || 'user'}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.quotedText}>{tweet.quoted_tweet.content}</Text>
                                </Card.Content>
                            </Card>
                        )}

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleReply}
                            >
                                <Text style={styles.actionIcon}>💬</Text>
                                <Text style={styles.actionText}>{tweet.reply_count}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleRetweet}
                            >
                                <Text style={styles.actionIcon}>🔄</Text>
                                <Text style={styles.actionText}>{tweet.retweet_count}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleQuote}
                            >
                                <Text style={styles.actionIcon}>💬</Text>
                                <Text style={styles.actionText}>{tweet.quote_count}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                            >
                                <Text style={styles.actionIcon}>❤️</Text>
                                <Text style={styles.actionText}>{tweet.like_count}</Text>
                            </TouchableOpacity>

                            <Menu
                                visible={showWeaponMenu}
                                onDismiss={() => setShowWeaponMenu(false)}
                                anchor={
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => setShowWeaponMenu(true)}
                                    >
                                        <Text style={styles.actionIcon}>⚔️</Text>
                                        <Text style={styles.actionText}>Attack</Text>
                                    </TouchableOpacity>
                                }
                            >
                                {weapons.map((weapon) => (
                                    <Menu.Item
                                        key={weapon._id.$oid}
                                        onPress={() => handleAttack(weapon._id.$oid)}
                                        title={`${weapon.image_url} ${weapon.name}`}
                                    />
                                ))}
                            </Menu>

                            <Menu
                                visible={false} // We'll implement heal menu similarly
                                onDismiss={() => { }}
                                anchor={
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                    >
                                        <Text style={styles.actionIcon}>💚</Text>
                                        <Text style={styles.actionText}>Heal</Text>
                                    </TouchableOpacity>
                                }
                            >
                                <Menu.Item
                                    onPress={() => { }}
                                    title="No heal weapons available"
                                />
                            </Menu>
                        </View>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 8,
        backgroundColor: '#1a1a1a',
    },
    container: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        backgroundColor: '#1DA1F2',
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    displayName: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 16,
    },
    username: {
        color: '#888',
        fontSize: 14,
    },
    time: {
        color: '#888',
        fontSize: 14,
    },
    tweetText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 12,
    },
    healthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    healthBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#333',
        borderRadius: 4,
        overflow: 'hidden',
    },
    healthFill: {
        height: '100%',
        borderRadius: 4,
    },
    healthText: {
        color: '#888',
        fontSize: 12,
        minWidth: 60,
    },
    quotedCard: {
        backgroundColor: '#2a2a2a',
        marginTop: 8,
    },
    quotedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    quotedAvatar: {
        backgroundColor: '#1DA1F2',
    },
    quotedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quotedName: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 14,
    },
    quotedUsername: {
        color: '#888',
        fontSize: 12,
    },
    quotedText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    actionIcon: {
        fontSize: 18,
        marginRight: 4,
    },
    actionText: {
        color: '#888',
        fontSize: 14,
    },
});
