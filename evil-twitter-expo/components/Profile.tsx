import { FollowButton } from '@/components/FollowButton';
import { FollowLists } from '@/components/FollowLists';
import { TweetCard } from '@/components/TweetCard';
import { AppText, AppButton, AppCard, AppScreen, Row, Column } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useFollowStore } from '@/lib/stores/followStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import { colors, spacing, radii, typography } from '@/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ProfileProps {
    // If viewing another user's profile
    userId?: string;
    // If viewing own profile
    isOwnProfile?: boolean;
    // Show back button (for user profile pages)
    showBackButton?: boolean;
    // Custom header title
    headerTitle?: string;
}

export function Profile({
    userId,
    isOwnProfile = false,
    showBackButton = false,
    headerTitle = "Profile"
}: ProfileProps) {
    const router = useRouter();

    // Auth and current user
    const { user: authUser, isAuthenticated } = useAuthStore();
    const {
        user: currentBackendUser,
        fetchUser: fetchCurrentUser,
        balances,
        adjustFollowersCount,
        profileUser,
        profileUserId,
        profileTweets,
        profileCompositeLoading,
        profileCompositeError,
        fetchProfileComposite,
        adjustProfileFollowers
    } = useBackendUserStore();

    // Determine which user we're displaying
    const displayUserId = isOwnProfile ? currentBackendUser?._id?.$oid : userId;
    const profileDataReady =
        !!displayUserId && profileUserId === displayUserId && !!profileUser;
    const displayUser = profileDataReady
        ? profileUser
        : isOwnProfile
            ? currentBackendUser
            : null;

    // Tweets and weapons
    const tweetsLoading =
        !!displayUserId &&
        (profileCompositeLoading || profileUserId !== displayUserId);
    const userTweets = profileDataReady ? profileTweets : [];
    const { weapons, fetchUserWeapons } = useWeaponsStore();

    const followStatusEntry = useFollowStore(
        useCallback(
            (state) =>
                displayUserId ? state.statusCache[displayUserId] : undefined,
            [displayUserId]
        )
    );
    const checkFollowStatus = useFollowStore((state) => state.checkFollowStatus);
    const followUser = useFollowStore((state) => state.followUser);
    const unfollowUser = useFollowStore((state) => state.unfollowUser);
    const isFollowing = followStatusEntry?.isFollowing ?? false;

    // Ensure current user is loaded for follow functionality
    useEffect(() => {
        if (authUser?.id && !currentBackendUser) {
            fetchCurrentUser(authUser.id);
        }
    }, [authUser?.id, currentBackendUser, fetchCurrentUser]);

    useEffect(() => {
        if (displayUserId) {
            fetchProfileComposite(displayUserId, currentBackendUser?._id?.$oid);
        }
    }, [displayUserId, currentBackendUser?._id?.$oid, fetchProfileComposite]);

    // Fetch user data (tweets, weapons, follow status)
    useEffect(() => {
        if (displayUserId) {
            fetchUserWeapons(displayUserId);
        }
    }, [displayUserId, fetchUserWeapons]);

    // Ensure follow status is available when viewing other profiles
    useEffect(() => {
        const viewerId = currentBackendUser?._id?.$oid;
        if (
            !isOwnProfile &&
            displayUserId &&
            viewerId &&
            viewerId !== displayUserId &&
            !followStatusEntry
        ) {
            checkFollowStatus(displayUserId, viewerId);
        }
    }, [
        isOwnProfile,
        displayUserId,
        currentBackendUser?._id?.$oid,
        followStatusEntry,
        checkFollowStatus,
    ]);


    const handleFollowToggle = async () => {
        const viewerId = currentBackendUser?._id?.$oid;
        if (!displayUserId || !viewerId) return;

        const delta = isFollowing ? -1 : 1;
        const canAdjustProfile = !isOwnProfile && profileDataReady;

        if (canAdjustProfile) {
            adjustProfileFollowers(delta);
        } else if (isOwnProfile) {
            adjustFollowersCount(delta);
        }

        try {
            if (isFollowing) {
                await unfollowUser(displayUserId, viewerId);
            } else {
                await followUser(displayUserId, viewerId);
            }
        } catch (error) {
            // Rollback on error
            if (canAdjustProfile) {
                adjustProfileFollowers(-delta);
            } else if (isOwnProfile) {
                adjustFollowersCount(-delta);
            }
            console.error('Follow action failed:', error);
            Alert.alert('Error', 'Failed to update follow status');
        }
    };

    const formatDate = (dateInput: any) => {
        try {
            let date: Date;

            // Handle MongoDB date format
            if (dateInput && typeof dateInput === 'object' && dateInput.$date && dateInput.$date.$numberLong) {
                date = new Date(parseInt(dateInput.$date.$numberLong));
            } else if (typeof dateInput === 'string') {
                date = new Date(dateInput);
            } else {
                return 'Unknown';
            }

            if (isNaN(date.getTime())) {
                return 'Unknown';
            }

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    const renderWeapon = ({ item }: { item: any }) => (
        <AppCard padding bordered style={styles.weaponCard}>
            <Row gap="md" align="center">
                <AppText variant="body" style={{ fontSize: 32 }}>{item.image_url}</AppText>
                <Column style={{ flex: 1 }} gap="xs">
                    <AppText variant="bodyLarge" style={{ fontWeight: '700' }}>{item.name}</AppText>
                    <AppText variant="caption" color="secondary">{item.description}</AppText>
                    <Row gap="lg">
                        <AppText variant="small">Impact: {item.impact}</AppText>
                        <AppText variant="small">Durability: {item.health}/{item.max_health}</AppText>
                    </Row>
                </Column>
            </Row>
        </AppCard>
    );

    // Loading states
    if (!isAuthenticated && isOwnProfile) {
        return (
            <AppScreen>
                <Row gap="lg" align="center" style={styles.header}>
                    {showBackButton && (
                        <AppButton variant="ghost" size="sm" onPress={() => router.back()}>
                            ← Back
                        </AppButton>
                    )}
                    <AppText variant="h4">{headerTitle}</AppText>
                </Row>
                <Column justify="center" align="center" style={{ flex: 1, padding: spacing['2xl'] }}>
                    <AppText variant="h2">Welcome to Evil Twitter</AppText>
                    <AppText variant="bodyLarge" color="secondary">Please sign in to view your profile</AppText>
                </Column>
            </AppScreen>
        );
    }

    if (isOwnProfile && !currentBackendUser) {
        return (
            <AppScreen>
                <Row align="center" style={styles.header}>
                    <AppText variant="h4">{headerTitle}</AppText>
                </Row>
                <Column justify="center" align="center" style={{ flex: 1, padding: spacing['2xl'] }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <AppText variant="bodyLarge">Loading profile...</AppText>
                </Column>
            </AppScreen>
        );
    }

    if (
        !isOwnProfile &&
        (!!displayUserId &&
            (profileCompositeLoading || profileUserId !== displayUserId))
    ) {
        return (
            <AppScreen>
                <Row gap="lg" align="center" style={styles.header}>
                    {showBackButton && (
                        <AppButton variant="ghost" size="sm" onPress={() => router.back()}>
                            ← Back
                        </AppButton>
                    )}
                    <AppText variant="h4">{headerTitle}</AppText>
                </Row>
                <Column justify="center" align="center" style={{ flex: 1, padding: spacing['2xl'] }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <AppText variant="bodyLarge">Loading profile...</AppText>
                </Column>
            </AppScreen>
        );
    }

    if (!isOwnProfile && profileCompositeError && !profileDataReady) {
        return (
            <AppScreen>
                <Row gap="lg" align="center" style={styles.header}>
                    {showBackButton && (
                        <AppButton variant="ghost" size="sm" onPress={() => router.back()}>
                            ← Back
                        </AppButton>
                    )}
                    <AppText variant="h4">{headerTitle}</AppText>
                </Row>
                <Column justify="center" align="center" gap="lg" style={{ flex: 1, padding: spacing['2xl'] }}>
                    <AppText variant="h3" color="danger">{profileCompositeError}</AppText>
                    <AppButton
                        variant="primary"
                        onPress={() => {
                            if (displayUserId) {
                                fetchProfileComposite(displayUserId, currentBackendUser?._id?.$oid);
                            }
                        }}>
                        Retry
                    </AppButton>
                </Column>
            </AppScreen>
        );
    }

    if (!displayUser) {
        return (
            <AppScreen>
                <Row gap="lg" align="center" style={styles.header}>
                    {showBackButton && (
                        <AppButton variant="ghost" size="sm" onPress={() => router.back()}>
                            ← Back
                        </AppButton>
                    )}
                    <AppText variant="h4">{headerTitle}</AppText>
                </Row>
                <Column justify="center" align="center" gap="lg" style={{ flex: 1, padding: spacing['2xl'] }}>
                    <AppText variant="h3" color="danger">User not found</AppText>
                    <AppButton variant="primary" onPress={() => router.back()}>
                        Go Back
                    </AppButton>
                </Column>
            </AppScreen>
        );
    }

    return (
        <AppScreen>
            {/* Header */}
            <Row gap="lg" align="center" style={styles.header}>
                {showBackButton && (
                    <AppButton variant="ghost" size="sm" onPress={() => router.back()}>
                        ← Back
                    </AppButton>
                )}
                <AppText variant="h4">{headerTitle}</AppText>
            </Row>

            <ScrollView style={styles.scrollView}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.coverPhoto} />
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.profileAvatar}>
                                <AppText variant="h2">
                                    {displayUser?.display_name?.charAt(0).toUpperCase() || '😈'}
                                </AppText>
                            </View>
                        </View>

                        <Column style={styles.profileDetails} gap="sm">
                            <Row justify="space-between" align="flex-start" style={{ paddingRight: spacing.sm }}>
                                <Column style={{ flex: 1 }} gap="xs">
                                    <AppText variant="h4">
                                        {displayUser?.display_name || 'Unknown User'}
                                    </AppText>
                                    <AppText variant="body" color="secondary">
                                        @{displayUser?.username || 'unknown'}
                                    </AppText>

                                    {displayUser?.bio && (
                                        <AppText variant="body">{displayUser.bio}</AppText>
                                    )}

                                    <AppText variant="body" color="secondary">
                                        📅 Joined {displayUser?.created_at ? formatDate(displayUser.created_at) : 'Unknown'}
                                    </AppText>
                                </Column>



                            </Row>
                        </Column>


                        {/* Follow Button for other users */}
                        {!isOwnProfile && currentBackendUser?._id?.$oid && userId && currentBackendUser._id.$oid !== userId && (
                            <View style={styles.followButtonContainer}>
                                <FollowButton
                                    isFollowing={isFollowing}
                                    onToggle={handleFollowToggle}
                                />
                            </View>
                        )}
                    </View>
                </View>

                {/* Profile Stats */}
                <Row wrap gap="sm" style={styles.statsContainer}>
                    <Column align="center" style={styles.statItem}>
                        <AppText variant="h4">{displayUser?.tweets_count || 0}</AppText>
                        <AppText variant="caption" color="secondary">Tweets</AppText>
                    </Column>
                    <Column align="center" style={styles.statItem}>
                        <AppText variant="h4">{displayUser?.followers_count || 0}</AppText>
                        <AppText variant="caption" color="secondary">Followers</AppText>
                    </Column>
                    <Column align="center" style={styles.statItem}>
                        <AppText variant="h4">{displayUser?.following_count || 0}</AppText>
                        <AppText variant="caption" color="secondary">Following</AppText>
                    </Column>
                    <Column align="center" style={[styles.statItem, styles.dollarRateItem]}>
                        <AppText variant="h4">
                            ${displayUser?.dollar_conversion_rate?.toLocaleString() || '0'}
                        </AppText>
                        <AppText variant="caption">Dollar Rate</AppText>
                    </Column>
                </Row>

                {/* Token Balances */}
                {balances && (
                    <View style={styles.balancesContainer}>
                        <AppText variant="h4">💰 Token Balances</AppText>
                        <Row wrap gap="md" style={{ marginTop: spacing.md }}>
                            <Column align="center" style={[styles.balanceItem, styles.blingItem]}>
                                <AppText variant="body" style={{ fontSize: 24, marginBottom: spacing.sm }}>💎</AppText>
                                <AppText variant="h4">
                                    {balances['Bling']?.toLocaleString() || '0'}
                                </AppText>
                                <AppText variant="small" color="secondary" style={{ textTransform: 'uppercase' }}>BLING</AppText>
                            </Column>
                            <Column align="center" style={styles.balanceItem}>
                                <AppText variant="body" style={{ fontSize: 24, marginBottom: spacing.sm }}>💵</AppText>
                                <AppText variant="h4">
                                    {balances['Dooler']?.toLocaleString() || '0'}
                                </AppText>
                                <AppText variant="small" color="secondary" style={{ textTransform: 'uppercase' }}>DOOLER</AppText>
                            </Column>
                            <Column align="center" style={styles.balanceItem}>
                                <AppText variant="body" style={{ fontSize: 24, marginBottom: spacing.sm }}>💲</AppText>
                                <AppText variant="h4">
                                    {balances['Usdc']?.toLocaleString() || '0'}
                                </AppText>
                                <AppText variant="small" color="secondary" style={{ textTransform: 'uppercase' }}>USDC</AppText>
                            </Column>
                            <Column align="center" style={styles.balanceItem}>
                                <AppText variant="body" style={{ fontSize: 24, marginBottom: spacing.sm }}>◎</AppText>
                                <AppText variant="h4">
                                    {balances['Sol']?.toLocaleString() || '0'}
                                </AppText>
                                <AppText variant="small" color="secondary" style={{ textTransform: 'uppercase' }}>SOL</AppText>
                            </Column>
                        </Row>
                    </View>
                )}

                {/* Followers/Following Section */}
                {displayUserId && (
                    <FollowLists
                        userId={displayUserId}
                        currentUserId={currentBackendUser?._id?.$oid}
                        showFollowButtons={!isOwnProfile}
                    />
                )}

                {/* Tabs */}
                <Row style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                        <AppText variant="bodyBold" color="accent">Tweets</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <AppText variant="bodyBold" color="secondary">Tweets & replies</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <AppText variant="bodyBold" color="secondary">Media</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <AppText variant="bodyBold" color="secondary">Likes</AppText>
                    </TouchableOpacity>
                </Row>

                {/* Account Information Section (only for own profile) */}
                {isOwnProfile && (
                    <View style={styles.accountInfoSection}>
                        <AppText variant="h4">📋 Account Information</AppText>
                        <AppCard padding elevated>
                            <Column gap="sm">
                                <Row justify="space-between" align="center" style={styles.accountInfoRow}>
                                    <AppText variant="caption" color="secondary">Email:</AppText>
                                    <AppText variant="caption" style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace' }}>{authUser?.email || 'N/A'}</AppText>
                                </Row>
                                <Row justify="space-between" align="center" style={styles.accountInfoRow}>
                                    <AppText variant="caption" color="secondary">Supabase User ID:</AppText>
                                    <AppText variant="caption" style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace' }}>{authUser?.id || 'N/A'}</AppText>
                                </Row>
                                <Row justify="space-between" align="center" style={styles.accountInfoRow}>
                                    <AppText variant="caption" color="secondary">Backend User ID:</AppText>
                                    <AppText variant="caption" style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace' }}>
                                        {currentBackendUser?._id?.$oid || 'Not loaded'}
                                    </AppText>
                                </Row>
                                <Row justify="space-between" align="center" style={styles.accountInfoRow}>
                                    <AppText variant="caption" color="secondary">Created:</AppText>
                                    <AppText variant="caption" style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace' }}>
                                        {authUser?.created_at ? formatDate(authUser.created_at) : 'N/A'}
                                    </AppText>
                                </Row>
                                <Row justify="space-between" align="center" style={styles.accountInfoRow}>
                                    <AppText variant="caption" color="secondary">Last Sign In:</AppText>
                                    <AppText variant="caption" style={{ flex: 2, textAlign: 'right', fontFamily: 'monospace' }}>
                                        {authUser?.last_sign_in_at ? formatDate(authUser.last_sign_in_at) : 'N/A'}
                                    </AppText>
                                </Row>
                            </Column>
                        </AppCard>
                    </View>
                )}

                {/* User Tweets Section */}
                <View style={styles.tweetsSection}>
                    <AppText variant="h4">
                        🐦 {isOwnProfile ? 'My' : ''} Tweets ({userTweets.length})
                    </AppText>
                    {tweetsLoading ? (
                        <Row gap="sm" align="center" justify="center" style={{ padding: spacing['2xl'] }}>
                            <ActivityIndicator size="small" color={colors.accent} />
                            <AppText variant="caption" color="secondary">Loading tweets...</AppText>
                        </Row>
                    ) : userTweets.length > 0 ? (
                        <FlatList
                            data={userTweets.slice(0, isOwnProfile ? 5 : 10)} // Show different amounts
                            renderItem={({ item }) => <TweetCard tweet={item} />}
                            keyExtractor={(item) => item._id.$oid}
                            scrollEnabled={false}
                            contentContainerStyle={styles.tweetsList}
                        />
                    ) : (
                        <Column align="center" gap="sm" style={{ padding: spacing['2xl'] }}>
                            <AppText variant="h3" color="secondary">No tweets yet</AppText>
                            <AppText variant="caption" color="secondary">
                                {isOwnProfile
                                    ? 'Start tweeting to see your posts here!'
                                    : "This user hasn't posted anything yet!"
                                }
                            </AppText>
                        </Column>
                    )}
                </View>

                {/* Weapons Section */}
                <View style={styles.weaponsSection}>
                    <AppText variant="h4">
                        ⚔️ {isOwnProfile ? 'My' : ''} Arsenal ({weapons.length})
                    </AppText>
                    {weapons.length > 0 ? (
                        <FlatList
                            data={weapons}
                            renderItem={renderWeapon}
                            keyExtractor={(item) => item._id.$oid}
                            scrollEnabled={false}
                            contentContainerStyle={styles.weaponsList}
                        />
                    ) : (
                        <Column align="center" gap="sm" style={{ padding: spacing['2xl'] }}>
                            <AppText variant="h3" color="secondary">No weapons yet</AppText>
                            <AppText variant="caption" color="secondary">
                                {isOwnProfile
                                    ? 'Visit the shop to buy some weapons!'
                                    : "This user hasn't bought any weapons yet!"
                                }
                            </AppText>
                        </Column>
                    )}
                </View>

            </ScrollView>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        position: 'sticky',
        top: 0,
        backgroundColor: colors.bg,
        zIndex: 10,
    },
    headerTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    profileHeader: {
        position: 'relative',
    },
    coverPhoto: {
        height: 200,
        backgroundColor: colors.accent,
    },
    profileInfo: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    avatarContainer: {
        marginTop: -40,
        marginBottom: spacing.lg,
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: colors.bg,
    },
    avatarText: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    profileDetails: {
        marginTop: spacing.sm,
    },
    displayName: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    username: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    bio: {
        ...typography.body,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    profileMeta: {
        marginBottom: spacing.lg,
    },
    metaText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    statsContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statItem: {
        flex: 1,
        minWidth: '25%',
        marginBottom: spacing.sm,
    },
    dollarRateItem: {
        backgroundColor: colors.borderStrong,
        borderRadius: radii.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    dollarRateText: {
        color: colors.textPrimary,
    },
    statNumber: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    statLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    tabsContainer: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: colors.accent,
    },
    tabText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    },
    activeTabText: {
        color: colors.accent,
    },
    accountInfoSection: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    accountInfoCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    accountInfoContent: {
        padding: spacing.lg,
    },
    accountInfoRow: {
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    accountInfoLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        flex: 1,
    },
    accountInfoValue: {
        ...typography.caption,
        color: colors.textPrimary,
        flex: 2,
        textAlign: 'right',
        fontFamily: 'monospace',
    },
    tweetsSection: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    tweetsList: {
        gap: spacing.sm,
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
    weaponsSection: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    weaponsList: {
        gap: spacing.md,
    },
    weaponCard: {
        marginBottom: spacing.md,
    },
    weaponName: {
        ...typography.bodyLarge,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    weaponDescription: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    weaponStats: {
        flexDirection: 'row',
        gap: spacing.lg,
    },
    statText: {
        ...typography.small,
        color: colors.textPrimary,
    },
    balancesContainer: {
        padding: spacing.lg,
        backgroundColor: colors.bgHover,
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        borderRadius: radii.lg,
    },
    balanceItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.bgCardSecondary,
        padding: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
    },
    blingItem: {
        backgroundColor: colors.blingBg,
        borderWidth: 2,
        borderColor: colors.blingBorder,
    },
    errorText: {
        ...typography.h3,
        color: colors.dangerStrong,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: colors.accent,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.pill,
    },
    retryButtonText: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    followButtonContainer: {
        position: 'absolute',
        top: spacing.lg,
        right: spacing.lg,
    },
    syncButtonTop: {
        backgroundColor: colors.accent,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.lg,
        alignItems: 'center',
        marginLeft: spacing.lg,
    },
    syncButtonText: {
        ...typography.captionBold,
        color: colors.textPrimary,
    },
});
