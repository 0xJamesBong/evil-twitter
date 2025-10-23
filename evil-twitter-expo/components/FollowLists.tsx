import { FollowListItem } from '@/components/FollowListItem';
import { FollowListEntry, useFollowStore } from '@/lib/stores/followStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FollowListsProps {
    userId: string;
    currentUserId?: string;
    showFollowButtons?: boolean;
    onFollowToggle?: (targetUserId: string) => void;
}

export function FollowLists({
    userId,
    currentUserId,
    showFollowButtons = false,
    onFollowToggle,
}: FollowListsProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');

    const fetchFollowers = useFollowStore((state) => state.fetchFollowers);
    const fetchFollowing = useFollowStore((state) => state.fetchFollowing);
    const followUser = useFollowStore((state) => state.followUser);
    const unfollowUser = useFollowStore((state) => state.unfollowUser);
    const followersEntry = useFollowStore((state) => state.getFollowers(userId));
    const followingEntry = useFollowStore((state) => state.getFollowing(userId));

    useEffect(() => {
        if (!userId) return;

        if (!followersEntry || followersEntry.viewerId !== (currentUserId ?? null)) {
            fetchFollowers(userId, currentUserId);
        }
        if (!followingEntry || followingEntry.viewerId !== (currentUserId ?? null)) {
            fetchFollowing(userId, currentUserId);
        }
    }, [
        userId,
        currentUserId,
        followersEntry,
        followingEntry,
        fetchFollowers,
        fetchFollowing,
    ]);

    const handleFollowToggle = async (
        targetUserId: string,
        currentlyFollowing: boolean
    ) => {
        if (!currentUserId) return;

        try {
            if (currentlyFollowing) {
                await unfollowUser(targetUserId, currentUserId);
            } else {
                await followUser(targetUserId, currentUserId);
            }

            onFollowToggle?.(targetUserId);
        } catch (error) {
            console.error('Follow action failed:', error);
        }
    };

    const renderUserItem = ({ item }: { item: FollowListEntry }) => {
        const canFollow = Boolean(
            showFollowButtons &&
            currentUserId &&
            !item.isViewer &&
            item.user._id.$oid !== currentUserId
        );

        return (
            <FollowListItem
                user={item.user}
                showBio
                onPress={(user) => router.push(`/profile/${user._id.$oid}`)}
                showFollowButton={canFollow}
                isFollowed={item.isFollowedByViewer}

                onToggleFollow={() =>
                    handleFollowToggle(item.user._id.$oid, item.isFollowedByViewer)
                }
            />
        );
    };

    const renderEmptyState = (type: 'followers' | 'following') => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </Text>
            <Text style={styles.emptySubtext}>
                {type === 'followers'
                    ? 'Start tweeting to get followers!'
                    : 'Start following people to see them here!'}
            </Text>
        </View>
    );

    const renderList = (type: 'followers' | 'following') => {
        const entry = type === 'followers' ? followersEntry : followingEntry;
        const data = entry?.data ?? [];
        const loading = entry?.loading ?? false;
        const error = entry?.error ?? null;

        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading {type}...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            );
        }

        if (!data.length) {
            return renderEmptyState(type);
        }

        return (
            <FlatList
                data={data}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.user._id.$oid}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
            />
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>👥 Followers & Following</Text>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
                    onPress={() => setActiveTab('followers')}
                >
                    <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                        Followers ({followersEntry?.data?.length ?? 0})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                    onPress={() => setActiveTab('following')}
                >
                    <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                        Following ({followingEntry?.data?.length ?? 0})
                    </Text>
                </TouchableOpacity>
            </View>

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
    errorContainer: {
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
    },
});
