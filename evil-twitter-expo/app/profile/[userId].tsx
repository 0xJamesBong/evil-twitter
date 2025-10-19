import { TweetCard } from '@/components/TweetCard';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';

export default function UserProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const router = useRouter();
    const { fetchUserById, user: targetUser, isLoading: userLoading } = useBackendUserStore();
    const { weapons, fetchUserWeapons } = useWeaponsStore();
    const { userTweets, fetchUserTweets, loading: tweetsLoading } = useTweetsStore();
    useEffect(() => {
        if (userId) {
            fetchUserById(userId);
        }
    }, [userId, fetchUserById]);

    useEffect(() => {
        if (targetUser?._id?.$oid) {
            fetchUserWeapons(targetUser._id.$oid);
            fetchUserTweets(targetUser._id.$oid);
        }
    }, [targetUser, fetchUserWeapons, fetchUserTweets]);

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

    if (userLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    if (!targetUser) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
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
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
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
                                    {targetUser?.display_name?.charAt(0).toUpperCase() || '😈'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.profileDetails}>
                            <View style={styles.profileHeaderRow}>
                                <View style={styles.profileInfo}>
                                    <Text style={styles.displayName}>
                                        {targetUser?.display_name || 'User'}
                                    </Text>
                                    <Text style={styles.username}>
                                        @{targetUser?.username || 'user'}
                                    </Text>

                                    {targetUser?.bio && (
                                        <Text style={styles.bio}>{targetUser.bio}</Text>
                                    )}

                                    <View style={styles.profileMeta}>
                                        <Text style={styles.metaText}>
                                            📅 Joined {targetUser?.created_at ? formatDate(targetUser.created_at) : 'Unknown'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Profile Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{targetUser?.tweets_count || 0}</Text>
                        <Text style={styles.statLabel}>Tweets</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{targetUser?.followers_count || 0}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{targetUser?.following_count || 0}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                    <View style={[styles.statItem, styles.dollarRateItem]}>
                        <Text style={[styles.statNumber, styles.dollarRateText]}>
                            ${targetUser?.dollar_conversion_rate?.toLocaleString() || '0'}
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

                {/* User Tweets Section */}
                <View style={styles.tweetsSection}>
                    <Text style={styles.sectionTitle}>🐦 Tweets ({userTweets.length})</Text>
                    {tweetsLoading ? (
                        <View style={styles.loadingTweets}>
                            <ActivityIndicator size="small" color="#1d9bf0" />
                            <Text style={styles.loadingTweetsText}>Loading tweets...</Text>
                        </View>
                    ) : userTweets.length > 0 ? (
                        <FlatList
                            data={userTweets.slice(0, 10)} // Show first 10 tweets
                            renderItem={({ item }) => <TweetCard tweet={item} />}
                            keyExtractor={(item) => item._id.$oid}
                            scrollEnabled={false}
                            contentContainerStyle={styles.tweetsList}
                        />
                    ) : (
                        <View style={styles.emptyTweets}>
                            <Text style={styles.emptyText}>No tweets yet</Text>
                            <Text style={styles.emptySubtext}>This user hasn't posted anything yet!</Text>
                        </View>
                    )}
                </View>

                {/* Weapons Section */}
                <View style={styles.weaponsSection}>
                    <Text style={styles.sectionTitle}>⚔️ Arsenal ({weapons.length})</Text>
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
                            <Text style={styles.emptySubtext}>This user hasn't bought any weapons yet!</Text>
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
    tweetsSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
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
});
