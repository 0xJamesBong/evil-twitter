import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View, FlatList } from 'react-native';
import { Appbar, Card, Text, Avatar, Button, Divider } from 'react-native-paper';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';

export default function ProfileScreen() {
    const { user: authUser, signOut } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();
    const { weapons, fetchUserWeapons } = useWeaponsStore();

    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchUserWeapons(backendUser._id.$oid);
        }
    }, [backendUser, fetchUserWeapons]);

    const handleSignOut = async () => {
        await signOut();
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

    if (!backendUser) {
        return (
            <View style={styles.container}>
                <Appbar.Header>
                    <Appbar.Content title="👤 Profile" />
                </Appbar.Header>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.Content title="👤 Profile" />
                <Appbar.Action icon="⚙️" onPress={() => { }} />
            </Appbar.Header>

            <ScrollView style={styles.content}>
                {/* Profile Header */}
                <Card style={styles.profileCard}>
                    <Card.Content style={styles.profileContent}>
                        <Avatar.Text
                            size={80}
                            label={backendUser.display_name?.charAt(0).toUpperCase() || '😈'}
                            style={styles.profileAvatar}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={styles.displayName}>{backendUser.display_name}</Text>
                            <Text style={styles.username}>@{backendUser.username}</Text>
                            {backendUser.bio && (
                                <Text style={styles.bio}>{backendUser.bio}</Text>
                            )}
                        </View>
                    </Card.Content>
                </Card>

                {/* Stats */}
                <Card style={styles.statsCard}>
                    <Card.Content>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{backendUser.follower_count}</Text>
                                <Text style={styles.statLabel}>Followers</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{backendUser.following_count}</Text>
                                <Text style={styles.statLabel}>Following</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>${backendUser.dollar_rate.toFixed(2)}</Text>
                                <Text style={styles.statLabel}>Rate</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

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

                {/* Sign Out Button */}
                <Button
                    mode="outlined"
                    onPress={handleSignOut}
                    style={styles.signOutButton}
                    textColor="#ff4444"
                >
                    Sign Out
                </Button>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
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
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
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
        marginBottom: 8,
    },
    bio: {
        fontSize: 16,
        color: '#ccc',
        lineHeight: 22,
    },
    statsCard: {
        backgroundColor: '#1a1a1a',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    statLabel: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    weaponsCard: {
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
    signOutButton: {
        borderColor: '#ff4444',
        marginTop: 16,
    },
});
