import { FollowListItem } from '@/components/FollowListItem';
import { FollowUser, useFollowStore } from '@/lib/stores/followStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FollowListsProps {
    userId: string;
    currentUserId?: string; // Optional - if provided, shows follow buttons
    showFollowButtons?: boolean; // Whether to show follow/unfollow buttons
    onFollowToggle?: (targetUserId: string) => void; // Optional callback for follow actions
}

export function FollowLists({
    userId,
    currentUserId,
    showFollowButtons = false,
    onFollowToggle
}: FollowListsProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');

    // Unified store
    const {
        followers,
        followersLoading,
        following,
        followingLoading,
        isFollowing,
        followStatusLoading,
        fetchFollowers,
        fetchFollowing,
    followUser,
    unfollowUser
  } = useFollowStore();

    // Fetch data when component mounts or userId changes
    useEffect(() => {
        if (userId) {
            fetchFollowers(userId);
            fetchFollowing(userId);
        }
    }, [userId, fetchFollowers, fetchFollowing]);

    const handleFollowToggle = async (targetUserId: string) => {
        if (!currentUserId) return;

        try {
            if (isFollowing) {
                await unfollowUser(targetUserId, currentUserId);
            } else {
                await followUser(targetUserId, currentUserId);
            }

            // Call the optional callback if provided
            if (onFollowToggle) {
                onFollowToggle(targetUserId);
            }
        } catch (error) {
            console.error('Follow action failed:', error);
        }
    };

    const renderUserItem = ({ item }: { item: FollowUser }) => (
        <FollowListItem
            user={item}
            onPress={(user) => router.push(`/profile/${user._id.$oid}`)}
            showFollowButton={Boolean(showFollowButtons && currentUserId && item._id.$oid !== currentUserId)}
            isFollowed={isFollowing}
            followBusy={followStatusLoading}
            onToggleFollow={() => handleFollowToggle(item._id.$oid)}
        />
    );

    const renderEmptyState = (type: 'followers' | 'following') => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </Text>
            <Text style={styles.emptySubtext}>
                {type === 'followers'
                    ? 'Start tweeting to get followers!'
                    : 'Start following people to see them here!'
                }
            </Text>
        </View>
    );

    const renderList = (type: 'followers' | 'following') => {
        const data = type === 'followers' ? followers : following;
        const loading = type === 'followers' ? followersLoading : followingLoading;

        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading {type}...</Text>
                </View>
            );
        }

        if (data.length === 0) {
            return renderEmptyState(type);
        }

        return (
            <FlatList
                data={data.slice(0, 5)} // Show only first 5
                renderItem={renderUserItem}
                keyExtractor={(item) => item._id.$oid}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
            />
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>👥 Followers & Following</Text>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
                    onPress={() => setActiveTab('followers')}
                >
                    <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                        Followers ({followers.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                    onPress={() => setActiveTab('following')}
                >
                    <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                        Following ({following.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'followers' ? renderList('followers') : renderList('following')}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#16181c',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#1d9bf0',
    },
    tabText: {
        fontSize: 14,
        color: '#71767b',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContainer: {
        gap: 12,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loadingText: {
        color: '#71767b',
        fontSize: 14,
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        color: '#71767b',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#71767b',
    },
});
