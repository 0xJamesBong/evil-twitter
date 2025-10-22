import { FollowLists } from '@/components/FollowLists';
import { TweetCard } from '@/components/TweetCard';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useFollowStore } from '@/lib/stores/followStore';
import { useProfileStore } from '@/lib/stores/profileStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';

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
    const { user: currentBackendUser, fetchUser: fetchCurrentUser, syncWithSupabase } = useBackendUserStore();

    // Profile data (for viewing other users)
    const {
        profileUser,
        isLoading: profileLoading,
        error: profileError,
        fetchProfile,
        clearProfile
    } = useProfileStore();

    // Follow functionality
    const {
        isFollowing,
        followStatusLoading,
        followActionLoading,
        followUser,
        unfollowUser,
        checkFollowStatus,
        clearFollowStatus
    } = useFollowStore();

    // Tweets and weapons
    const { userTweets, fetchUserTweets, loading: tweetsLoading } = useTweetsStore();
    const { weapons, fetchUserWeapons } = useWeaponsStore();

    // Determine which user we're displaying
    const displayUser = isOwnProfile ? currentBackendUser : profileUser;
    const displayUserId = isOwnProfile ? currentBackendUser?._id?.$oid : userId;

    // Fetch profile data for other users
    useEffect(() => {
        if (!isOwnProfile && userId) {
            fetchProfile(userId);
            return () => {
                clearProfile();
            };
        }
    }, [userId, fetchProfile, clearProfile, isOwnProfile]);

    // Ensure current user is loaded for follow functionality
    useEffect(() => {
        if (authUser?.id && !currentBackendUser) {
            fetchCurrentUser(authUser.id);
        }
    }, [authUser?.id, currentBackendUser, fetchCurrentUser]);

    // Fetch user data (tweets, weapons, follow status)
    useEffect(() => {
        if (displayUserId) {
            fetchUserWeapons(displayUserId);
            fetchUserTweets(displayUserId);
        }
    }, [displayUserId, fetchUserWeapons, fetchUserTweets]);

    // Check follow status when viewing another user
    useEffect(() => {
        if (!isOwnProfile && currentBackendUser?._id?.$oid && userId && currentBackendUser._id.$oid !== userId) {
            checkFollowStatus(userId, currentBackendUser._id.$oid);
        } else if (isOwnProfile) {
            // Clear follow status when viewing own profile
            clearFollowStatus();
        }
    }, [isOwnProfile, currentBackendUser, userId, checkFollowStatus, clearFollowStatus]);

    const handleSyncWithSupabase = async () => {
        if (authUser) {
            try {
                await syncWithSupabase(authUser);
                Alert.alert('Success', 'Profile synced with Supabase!');
            } catch (error) {
                console.error('Sync error:', error);
                Alert.alert('Error', 'Failed to sync profile');
            }
        }
    };

    const handleFollowToggle = async () => {
        if (!userId || !currentBackendUser?._id?.$oid) return;

        try {
            if (isFollowing) {
                await unfollowUser(userId, currentBackendUser._id.$oid);
            } else {
                await followUser(userId, currentBackendUser._id.$oid);
            }

            // Refresh profile data to get updated follower counts
            if (!isOwnProfile && userId) {
                await fetchProfile(userId);
            }
        } catch (error) {
            console.error('Follow action failed:', error);
            Alert.alert('Error', 'Failed to update follow status');
        }
    };

    const followButtonBusy = Boolean(
        followStatusLoading ||
        (displayUserId ? followActionLoading[displayUserId] : false)
    );

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
        <Card style={styles.weaponCard}>
            <Card.Content style={styles.weaponContent}>
                <Text style={styles.weaponEmoji}>{item.image_url}</Text>
                <View style={styles.weaponInfo}>
                    <Text style={styles.weaponName}>{item.name}</Text>
                    <Text style={styles.weaponDescription}>{item.description}</Text>
                    <View style={styles.weaponStats}>
                        <Text style={styles.statText}>Health: {item.health}/{item.max_health}</Text>
                        <Text style={styles.statText}>Damage: {item.damage}</Text>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );

    // Loading states
    if (!isAuthenticated && isOwnProfile) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    {showBackButton && (
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.welcomeText}>Welcome to Evil Twitter</Text>
                    <Text style={styles.signInPrompt}>Please sign in to view your profile</Text>
                </View>
            </View>
        );
    }

    if (isOwnProfile && !currentBackendUser) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    if (!isOwnProfile && profileLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    {showBackButton && (
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    if (!isOwnProfile && profileError) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    {showBackButton && (
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{profileError}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => userId && fetchProfile(userId)}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!displayUser) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    {showBackButton && (
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>User not found</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                {showBackButton && (
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>{headerTitle}</Text>
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.coverPhoto} />
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.profileAvatar}>
                                <Text style={styles.avatarText}>
                                    {displayUser?.display_name?.charAt(0).toUpperCase() || '😈'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.profileDetails}>
                            <View style={styles.profileHeaderRow}>
                                <View style={styles.profileInfo}>
                                    <Text style={styles.displayName}>
                                        {displayUser?.display_name || 'Unknown User'}
                                    </Text>
                                    <Text style={styles.username}>
                                        @{displayUser?.username || 'unknown'}
                                    </Text>

                                    {displayUser?.bio && (
                                        <Text style={styles.bio}>{displayUser.bio}</Text>
                                    )}

                                    <View style={styles.profileMeta}>
                                        <Text style={styles.metaText}>
                                            📅 Joined {displayUser?.created_at ? formatDate(displayUser.created_at) : 'Unknown'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Sync button for own profile */}
                                {isOwnProfile && (
                                    <TouchableOpacity style={styles.syncButtonTop} onPress={handleSyncWithSupabase}>
                                        <Text style={styles.syncButtonText}>🔄 Sync</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Follow Button for other users */}
                        {!isOwnProfile && currentBackendUser?._id?.$oid && userId && currentBackendUser._id.$oid !== userId && (
                            <View style={styles.followButtonContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.followButton,
                                        isFollowing && styles.followingButton,
                                        followButtonBusy && styles.followButtonDisabled
                                    ]}
                                    onPress={handleFollowToggle}
                                    disabled={followButtonBusy}
                                >
                                    {followButtonBusy ? (
                                        <ActivityIndicator size="small" color={isFollowing ? "#71767b" : "#fff"} />
                                    ) : (
                                        <Text style={[
                                            styles.followButtonText,
                                            isFollowing && styles.followingButtonText
                                        ]}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Profile Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{displayUser?.tweets_count || 0}</Text>
                        <Text style={styles.statLabel}>Tweets</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{displayUser?.followers_count || 0}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{displayUser?.following_count || 0}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                    <View style={[styles.statItem, styles.dollarRateItem]}>
                        <Text style={[styles.statNumber, styles.dollarRateText]}>
                            ${displayUser?.dollar_conversion_rate?.toLocaleString() || '0'}
                        </Text>
                        <Text style={[styles.statLabel, styles.dollarRateText]}>Dollar Rate</Text>
                    </View>
                </View>

                {/* Followers/Following Section */}
                {displayUserId && (
                    <FollowLists
                        userId={displayUserId}
                        currentUserId={currentBackendUser?._id?.$oid}
                        showFollowButtons={!isOwnProfile}
                    />
                )}

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                        <Text style={[styles.tabText, styles.activeTabText]}>Tweets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <Text style={styles.tabText}>Tweets & replies</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <Text style={styles.tabText}>Media</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <Text style={styles.tabText}>Likes</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Information Section (only for own profile) */}
                {isOwnProfile && (
                    <View style={styles.accountInfoSection}>
                        <Text style={styles.sectionTitle}>📋 Account Information</Text>
                        <Card style={styles.accountInfoCard}>
                            <Card.Content style={styles.accountInfoContent}>
                                <View style={styles.accountInfoRow}>
                                    <Text style={styles.accountInfoLabel}>Email:</Text>
                                    <Text style={styles.accountInfoValue}>{authUser?.email || 'N/A'}</Text>
                                </View>
                                <View style={styles.accountInfoRow}>
                                    <Text style={styles.accountInfoLabel}>Supabase User ID:</Text>
                                    <Text style={styles.accountInfoValue}>{authUser?.id || 'N/A'}</Text>
                                </View>
                                <View style={styles.accountInfoRow}>
                                    <Text style={styles.accountInfoLabel}>Backend User ID:</Text>
                                    <Text style={styles.accountInfoValue}>
                                        {currentBackendUser?._id?.$oid || 'Not loaded'}
                                    </Text>
                                </View>
                                <View style={styles.accountInfoRow}>
                                    <Text style={styles.accountInfoLabel}>Created:</Text>
                                    <Text style={styles.accountInfoValue}>
                                        {authUser?.created_at ? formatDate(authUser.created_at) : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.accountInfoRow}>
                                    <Text style={styles.accountInfoLabel}>Last Sign In:</Text>
                                    <Text style={styles.accountInfoValue}>
                                        {authUser?.last_sign_in_at ? formatDate(authUser.last_sign_in_at) : 'N/A'}
                                    </Text>
                                </View>
                            </Card.Content>
                        </Card>
                    </View>
                )}

                {/* User Tweets Section */}
                <View style={styles.tweetsSection}>
                    <Text style={styles.sectionTitle}>
                        🐦 {isOwnProfile ? 'My' : ''} Tweets ({userTweets.length})
                    </Text>
                    {tweetsLoading ? (
                        <View style={styles.loadingTweets}>
                            <ActivityIndicator size="small" color="#1d9bf0" />
                            <Text style={styles.loadingTweetsText}>Loading tweets...</Text>
                        </View>
                    ) : userTweets.length > 0 ? (
                        <FlatList
                            data={userTweets.slice(0, isOwnProfile ? 5 : 10)} // Show different amounts
                            renderItem={({ item }) => <TweetCard tweet={item} />}
                            keyExtractor={(item) => item._id.$oid}
                            scrollEnabled={false}
                            contentContainerStyle={styles.tweetsList}
                        />
                    ) : (
                        <View style={styles.emptyTweets}>
                            <Text style={styles.emptyText}>No tweets yet</Text>
                            <Text style={styles.emptySubtext}>
                                {isOwnProfile
                                    ? 'Start tweeting to see your posts here!'
                                    : "This user hasn't posted anything yet!"
                                }
                            </Text>
                        </View>
                    )}
                </View>

                {/* Weapons Section */}
                <View style={styles.weaponsSection}>
                    <Text style={styles.sectionTitle}>
                        ⚔️ {isOwnProfile ? 'My' : ''} Arsenal ({weapons.length})
                    </Text>
                    {weapons.length > 0 ? (
                        <FlatList
                            data={weapons}
                            renderItem={renderWeapon}
                            keyExtractor={(item) => item._id.$oid}
                            scrollEnabled={false}
                            contentContainerStyle={styles.weaponsList}
                        />
                    ) : (
                        <View style={styles.emptyWeapons}>
                            <Text style={styles.emptyText}>No weapons yet</Text>
                            <Text style={styles.emptySubtext}>
                                {isOwnProfile
                                    ? 'Visit the shop to buy some weapons!'
                                    : "This user hasn't bought any weapons yet!"
                                }
                            </Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
        position: 'sticky',
        top: 0,
        backgroundColor: '#000',
        zIndex: 10,
    },
    backButton: {
        marginRight: 16,
    },
    backButtonText: {
        color: '#1d9bf0',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    profileHeader: {
        position: 'relative',
    },
    coverPhoto: {
        height: 200,
        backgroundColor: '#1d9bf0',
    },
    profileInfo: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    avatarContainer: {
        marginTop: -40,
        marginBottom: 16,
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#000',
    },
    avatarText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    profileDetails: {
        marginTop: 8,
    },
    profileHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingRight: 8,
    },
    displayName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    username: {
        fontSize: 15,
        color: '#71767b',
        marginBottom: 12,
    },
    bio: {
        fontSize: 15,
        color: '#e7e9ea',
        lineHeight: 20,
        marginBottom: 12,
    },
    profileMeta: {
        marginBottom: 16,
    },
    metaText: {
        fontSize: 15,
        color: '#71767b',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
        flexWrap: 'wrap',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        minWidth: '25%',
        marginBottom: 8,
    },
    dollarRateItem: {
        backgroundColor: '#536471',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    dollarRateText: {
        color: '#fff',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#71767b',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#1d9bf0',
    },
    tabText: {
        fontSize: 15,
        color: '#71767b',
        fontWeight: 'bold',
    },
    activeTabText: {
        color: '#1d9bf0',
    },
    accountInfoSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    accountInfoCard: {
        backgroundColor: '#16181c',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2f3336',
    },
    accountInfoContent: {
        padding: 16,
    },
    accountInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    accountInfoLabel: {
        fontSize: 14,
        color: '#71767b',
        flex: 1,
    },
    accountInfoValue: {
        fontSize: 14,
        color: '#e7e9ea',
        flex: 2,
        textAlign: 'right',
        fontFamily: 'monospace',
    },
    tweetsSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    tweetsList: {
        gap: 8,
    },
    loadingTweets: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loadingTweetsText: {
        color: '#71767b',
        fontSize: 14,
        marginLeft: 8,
    },
    emptyTweets: {
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
    weaponsSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    weaponsList: {
        gap: 12,
    },
    weaponCard: {
        backgroundColor: '#16181c',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2f3336',
    },
    weaponContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    weaponEmoji: {
        fontSize: 32,
    },
    weaponInfo: {
        flex: 1,
    },
    weaponName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    weaponDescription: {
        fontSize: 14,
        color: '#71767b',
        marginBottom: 8,
    },
    weaponStats: {
        flexDirection: 'row',
        gap: 16,
    },
    statText: {
        fontSize: 12,
        color: '#e7e9ea',
    },
    emptyWeapons: {
        alignItems: 'center',
        padding: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    signInPrompt: {
        color: '#71767b',
        fontSize: 16,
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        color: '#f4212e',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    followButtonContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
    followButton: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        minWidth: 80,
    },
    followingButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#71767b',
    },
    followButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    followingButtonText: {
        color: '#71767b',
    },
    followButtonDisabled: {
        opacity: 0.6,
    },
    syncButtonTop: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: 'center',
        marginLeft: 16,
    },
    syncButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
