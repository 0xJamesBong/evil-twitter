import { FollowListItem } from '@/components/FollowListItem';
import { FollowListEntry, useFollowStore } from '@/lib/stores/followStore';
import { AppText } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';
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
    const followersEntry = useFollowStore((state) => state.followersCache[userId]);
    const followingEntry = useFollowStore((state) => state.followingCache[userId]);

    useEffect(() => {
        if (!userId) return;

        console.log('FollowLists useEffect:', {
            userId,
            currentUserId,
            followersEntry: !!followersEntry,
            followingEntry: !!followingEntry,
            followersViewerId: followersEntry?.viewerId,
            followingViewerId: followingEntry?.viewerId
        });

        if (!followersEntry || followersEntry.viewerId !== (currentUserId ?? null)) {
            console.log('Fetching followers for:', userId);
            fetchFollowers(userId, currentUserId);
        }
        if (!followingEntry || followingEntry.viewerId !== (currentUserId ?? null)) {
            console.log('Fetching following for:', userId);
            fetchFollowing(userId, currentUserId);
        }
    }, [
        userId,
        currentUserId,
        fetchFollowers,
        fetchFollowing,
    ]);

    const handleFollowToggle = async (
        targetUserId: string,
        currentlyFollowing: boolean
    ) => {
        console.log('handleFollowToggle called:', { targetUserId, currentlyFollowing, currentUserId });

        if (!currentUserId) {
            console.log('No currentUserId, returning early');
            return;
        }

        try {
            if (currentlyFollowing) {
                console.log('Unfollowing user:', targetUserId);
                await unfollowUser(targetUserId, currentUserId);
            } else {
                console.log('Following user:', targetUserId);
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

        // Debug logging
        console.log('FollowLists renderUserItem:', {
            showFollowButtons,
            currentUserId,
            isViewer: item.isViewer,
            userId: item.user._id.$oid,
            canFollow
        });

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
            <AppText variant="h3" color="secondary">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </AppText>
            <AppText variant="caption" color="secondary">
                {type === 'followers'
                    ? 'Start tweeting to get followers!'
                    : 'Start following people to see them here!'}
            </AppText>
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
                    <ActivityIndicator size="small" color={colors.accent} />
                    <AppText variant="caption" color="secondary">Loading {type}...</AppText>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <AppText variant="caption" color="danger">{error}</AppText>
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
            <AppText variant="h4">👥 Followers & Following</AppText>

            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
                    onPress={() => setActiveTab('followers')}
                >
                    <AppText variant="caption" color={activeTab === 'followers' ? 'primary' : 'secondary'} style={{ fontWeight: activeTab === 'followers' ? '600' : '400' }}>
                        Followers ({followersEntry?.data?.length ?? 0})
                    </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                    onPress={() => setActiveTab('following')}
                >
                    <AppText variant="caption" color={activeTab === 'following' ? 'primary' : 'secondary'} style={{ fontWeight: activeTab === 'following' ? '600' : '400' }}>
                        Following ({followingEntry?.data?.length ?? 0})
                    </AppText>
                </TouchableOpacity>
            </View>

            {activeTab === 'followers' ? renderList('followers') : renderList('following')}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
        backgroundColor: colors.bgCard,
        borderRadius: radii.md,
        padding: spacing.xs,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        borderRadius: radii.sm,
    },
    activeTab: {
        backgroundColor: colors.accent,
    },
    tabText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    activeTabText: {
        ...typography.captionBold,
        color: colors.textPrimary,
    },
    listContainer: {
        gap: spacing.md,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
    },
    loadingText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing['2xl'],
    },
    emptyText: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    errorContainer: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    errorText: {
        ...typography.caption,
        color: colors.danger,
    },
});
