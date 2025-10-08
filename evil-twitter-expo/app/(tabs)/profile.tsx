import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card, Text, Avatar, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { RightSidebar } from '@/components/RightSidebar';

export default function ProfileScreen() {
    const { user: authUser, logout, isAuthenticated } = useAuthStore();
    const { user: backendUser, fetchUser, syncWithSupabase, isLoading: backendLoading } = useBackendUserStore();
    const { weapons, fetchUserWeapons } = useWeaponsStore();

    useEffect(() => {
        if (authUser?.id && !backendUser) {
            fetchUser(authUser.id);
        }
    }, [authUser?.id, backendUser, fetchUser]);

    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchUserWeapons(backendUser._id.$oid);
        }
    }, [backendUser, fetchUserWeapons]);

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to sign out');
                        }
                    }
                }
            ]
        );
    };

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
            <View style={styles.webContainer}>
                <Navbar />
                <View style={styles.webMainContent}>
                    <View style={styles.webLeftSidebar}>
                        <Sidebar />
                    </View>
                    <View style={styles.webCenterContent}>
                        <View style={styles.webLoadingContainer}>
                            <Text style={styles.welcomeText}>Welcome to Evil Twitter</Text>
                            <Text style={styles.signInPrompt}>Please sign in to view your profile</Text>
                        </View>
                    </View>
                    <View style={styles.webRightSidebar}>
                        <RightSidebar />
                    </View>
                </View>
            </View>
        );
    }

    if (backendLoading) {
        return (
            <View style={styles.webContainer}>
                <Navbar />
                <View style={styles.webMainContent}>
                    <View style={styles.webLeftSidebar}>
                        <Sidebar />
                    </View>
                    <View style={styles.webCenterContent}>
                        <View style={styles.webLoadingContainer}>
                            <ActivityIndicator size="large" color="#1DA1F2" />
                            <Text style={styles.loadingText}>Loading profile...</Text>
                        </View>
                    </View>
                    <View style={styles.webRightSidebar}>
                        <RightSidebar />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.webContainer}>
            <Navbar />
            <View style={styles.webMainContent}>
                <View style={styles.webLeftSidebar}>
                    <Sidebar />
                </View>
                <View style={styles.webCenterContent}>
                    <ScrollView style={styles.webContent}>
                        {/* Profile Header */}
                        <Card style={styles.profileCard}>
                            <Card.Content style={styles.profileContent}>
                                <Avatar.Text
                                    size={80}
                                    label={backendUser?.display_name?.charAt(0).toUpperCase() || authUser?.email?.charAt(0).toUpperCase() || '😈'}
                                    style={styles.profileAvatar}
                                />
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
                                    {authUser?.email && (
                                        <Text style={styles.email}>{authUser.email}</Text>
                                    )}
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Account Information */}
                        <Card style={styles.infoCard}>
                            <Card.Content>
                                <Text style={styles.sectionTitle}>📋 Account Information</Text>
                                <Divider style={styles.divider} />

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Email:</Text>
                                    <Text style={styles.infoValue}>{authUser?.email || 'N/A'}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Supabase User ID:</Text>
                                    <Text style={styles.infoValue}>{authUser?.id || 'N/A'}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Backend User ID:</Text>
                                    <Text style={styles.infoValue}>{backendUser?._id?.$oid || 'Not loaded'}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Created:</Text>
                                    <Text style={styles.infoValue}>
                                        {authUser?.created_at ? formatDate(authUser.created_at) : 'N/A'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Last Sign In:</Text>
                                    <Text style={styles.infoValue}>
                                        {authUser?.last_sign_in_at ? formatDate(authUser.last_sign_in_at) : 'N/A'}
                                    </Text>
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Profile Stats */}
                        {backendUser && (
                            <Card style={styles.statsCard}>
                                <Card.Content>
                                    <Text style={styles.sectionTitle}>📊 Profile Stats</Text>
                                    <Divider style={styles.divider} />

                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{backendUser.tweets_count || 0}</Text>
                                            <Text style={styles.statLabel}>Tweets</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{backendUser.followers_count || 0}</Text>
                                            <Text style={styles.statLabel}>Followers</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statNumber}>{backendUser.following_count || 0}</Text>
                                            <Text style={styles.statLabel}>Following</Text>
                                        </View>
                                        <View style={[styles.statCard, styles.dollarCard]}>
                                            <Text style={styles.statNumber}>
                                                ${backendUser.dollar_conversion_rate?.toLocaleString() || '0'}
                                            </Text>
                                            <Text style={styles.statLabel}>Dollar Rate</Text>
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        )}

                        {/* User Metadata */}
                        {authUser?.user_metadata && Object.keys(authUser.user_metadata).length > 0 && (
                            <Card style={styles.metadataCard}>
                                <Card.Content>
                                    <Text style={styles.sectionTitle}>👤 Profile Info</Text>
                                    <Divider style={styles.divider} />

                                    {Object.entries(authUser.user_metadata).map(([key, value]) => (
                                        <View key={key} style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>
                                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                            </Text>
                                            <Text style={styles.infoValue}>{String(value)}</Text>
                                        </View>
                                    ))}
                                </Card.Content>
                            </Card>
                        )}

                        {/* Weapons Section */}
                        <Card style={styles.weaponsCard}>
                            <Card.Content>
                                <Text style={styles.sectionTitle}>⚔️ My Arsenal ({weapons.length})</Text>
                                <Divider style={styles.divider} />

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
                            </Card.Content>
                        </Card>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <Button
                                mode="outlined"
                                onPress={handleSyncWithSupabase}
                                style={styles.syncButton}
                                textColor="#1DA1F2"
                                icon="🔄"
                            >
                                Sync with Supabase
                            </Button>

                            <Button
                                mode="outlined"
                                onPress={handleSignOut}
                                style={styles.signOutButton}
                                textColor="#ff4444"
                                icon="🚪"
                            >
                                Sign Out
                            </Button>
                        </View>
                    </ScrollView>
                </View>
                <View style={styles.webRightSidebar}>
                    <RightSidebar />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Web layout styles
    webContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    webMainContent: {
        flex: 1,
        flexDirection: 'row',
        paddingTop: 64,
    },
    webLeftSidebar: {
        width: 256,
        borderRightWidth: 1,
        borderRightColor: '#333',
    },
    webCenterContent: {
        flex: 1,
        marginRight: 320,
    },
    webRightSidebar: {
        width: 320,
        borderLeftWidth: 1,
        borderLeftColor: '#333',
        padding: 16,
    },
    webContent: {
        flex: 1,
        padding: 16,
    },
    webLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    // Mobile layout styles (kept for compatibility)
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        padding: 16,
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
        color: '#888',
        fontSize: 16,
        textAlign: 'center',
    },
    profileCard: {
        backgroundColor: '#1a1a1a',
        marginBottom: 16,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    profileAvatar: {
        backgroundColor: '#1DA1F2',
    },
    profileInfo: {
        flex: 1,
    },
    displayName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        color: '#888',
        marginBottom: 4,
    },
    bio: {
        fontSize: 16,
        color: '#ccc',
        lineHeight: 22,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    infoCard: {
        backgroundColor: '#1a1a1a',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    divider: {
        backgroundColor: '#333',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    infoLabel: {
        fontSize: 14,
        color: '#888',
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: '#fff',
        flex: 2,
        textAlign: 'right',
        fontFamily: 'monospace',
    },
    statsCard: {
        backgroundColor: '#1a1a1a',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        flex: 1,
        minWidth: '45%',
    },
    dollarCard: {
        backgroundColor: '#8B5CF6',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
    },
    metadataCard: {
        backgroundColor: '#1a1a1a',
        marginBottom: 16,
    },
    weaponsCard: {
        backgroundColor: '#1a1a1a',
        marginBottom: 16,
    },
    weaponsList: {
        gap: 12,
    },
    weaponCard: {
        backgroundColor: '#2a2a2a',
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
        color: '#888',
        marginBottom: 8,
    },
    weaponStats: {
        flexDirection: 'row',
        gap: 16,
    },
    statText: {
        fontSize: 12,
        color: '#ccc',
    },
    emptyWeapons: {
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        color: '#888',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
    },
    actionButtons: {
        gap: 12,
        marginTop: 16,
    },
    syncButton: {
        borderColor: '#1DA1F2',
    },
    signOutButton: {
        borderColor: '#ff4444',
    },
});