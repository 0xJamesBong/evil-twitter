import { TweetCard } from '@/components/TweetCard';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';

export default function ProfileScreen() {
    const { user: authUser, logout, isAuthenticated } = useAuthStore();
    const { user: backendUser, fetchUser, syncWithSupabase, isLoading: backendLoading } = useBackendUserStore();
    const { weapons, fetchUserWeapons } = useWeaponsStore();
    const { userTweets, fetchUserTweets, loading: tweetsLoading } = useTweetsStore();

    useEffect(() => {
        if (authUser?.id && !backendUser) {
            fetchUser(authUser.id);
        }
    }, [authUser?.id, backendUser, fetchUser]);

    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchUserWeapons(backendUser._id.$oid);
            fetchUserTweets(backendUser._id.$oid);
        }
    }, [backendUser, fetchUserWeapons, fetchUserTweets]);


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

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return 'Invalid Date';
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

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.welcomeText}>Welcome to Evil Twitter</Text>
                    <Text style={styles.signInPrompt}>Please sign in to view your profile</Text>
                </View>
            </View>
        );
    }

    if (backendLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.coverPhoto} />
                    <View style={styles.profileInfo}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.profileAvatar}>
                                <Text style={styles.avatarText}>
                                    {backendUser?.display_name?.charAt(0).toUpperCase() || authUser?.email?.charAt(0).toUpperCase() || '😈'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.profileDetails}>
                            <View style={styles.profileHeaderRow}>
                                <View style={styles.profileInfo}>
                                    <Text style={styles.displayName}>
                                        {backendUser?.display_name || authUser?.user_metadata?.display_name || authUser?.email?.split('@')[0] || 'User'}
                                    </Text>
                                    <Text style={styles.username}>
                                        @{backendUser?.username || authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || 'user'}
                                    </Text>

                                    {backendUser?.bio && (
                                        <Text style={styles.bio}>{backendUser.bio}</Text>
                                    )}

                                    <View style={styles.profileMeta}>
                                        <Text style={styles.metaText}>
                                            📅 Joined {authUser?.created_at ? formatDate(authUser.created_at) : 'Unknown'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.syncButtonTop} onPress={handleSyncWithSupabase}>
                                    <Text style={styles.syncButtonText}>🔄 Sync</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Profile Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{backendUser?.tweets_count || 0}</Text>
                        <Text style={styles.statLabel}>Tweets</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{backendUser?.followers_count || 0}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{backendUser?.following_count || 0}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                    <View style={[styles.statItem, styles.dollarRateItem]}>
                        <Text style={[styles.statNumber, styles.dollarRateText]}>
                            ${backendUser?.dollar_conversion_rate?.toLocaleString() || '0'}
                        </Text>
                        <Text style={[styles.statLabel, styles.dollarRateText]}>Dollar Rate</Text>
                    </View>
                </View>

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

                {/* Account Information Section */}
                <View style={styles.accountInfoSection}>
                    <Text style={styles.sectionTitle}>📋 Account Information</Text>
                    <Card style={styles.accountInfoCard}>
                        <Card.Content style={styles.accountInfoContent}>
                            <View style={styles.accountInfoRow}>
                                <Text style={styles.accountInfoLabel}>Email:</Text>
                                <Text style={styles.accountInfoValue}>{authUser?.email || 'N/A'}</Text>
                            </View>
                            {/* <View style={styles.accountInfoRow}>
                                <Text style={styles.accountInfoLabel}>Supabase User ID:</Text>
                                <Text style={styles.accountInfoValue}>{authUser?.id || 'N/A'}</Text>
                            </View> */}
                            {/* <View style={styles.accountInfoRow}>
                                <Text style={styles.accountInfoLabel}>Backend User ID:</Text>
                                <Text style={styles.accountInfoValue}>
                                    {backendUser?._id?.$oid || 'Not loaded'}
                                </Text> 
                            </View> */}
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

                {/* Weapons Section */}
                <View style={styles.weaponsSection}>
                    <Text style={styles.sectionTitle}>⚔️ My Arsenal ({weapons.length})</Text>
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
                            <Text style={styles.emptySubtext}>Visit the shop to buy some weapons!</Text>
                        </View>
                    )}
                </View>

                {/* User Tweets Section */}
                <View style={styles.tweetsSection}>
                    <Text style={styles.sectionTitle}>🐦 My Tweets ({userTweets.length})</Text>
                    {tweetsLoading ? (
                        <View style={styles.loadingTweets}>
                            <ActivityIndicator size="small" color="#1d9bf0" />
                            <Text style={styles.loadingTweetsText}>Loading tweets...</Text>
                        </View>
                    ) : userTweets.length > 0 ? (
                        <FlatList
                            data={userTweets.slice(0, 5)} // Show only first 5 tweets
                            renderItem={({ item }) => <TweetCard tweet={item} />}
                            keyExtractor={(item) => item._id.$oid}
                            scrollEnabled={false}
                            contentContainerStyle={styles.tweetsList}
                        />
                    ) : (
                        <View style={styles.emptyTweets}>
                            <Text style={styles.emptyText}>No tweets yet</Text>
                            <Text style={styles.emptySubtext}>Start tweeting to see your posts here!</Text>
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
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
        position: 'sticky',
        top: 0,
        backgroundColor: '#000',
        zIndex: 10,
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
    },
    profileInfo: {
        flex: 1,
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
    weaponsSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
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
    emptyText: {
        fontSize: 18,
        color: '#71767b',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#71767b',
    },
    syncButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    accountInfoSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
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
    syncButtonTop: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: 'center',
        marginLeft: 16,
    },
});