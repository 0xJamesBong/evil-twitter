import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function Sidebar() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();

    const navigation = [
        { name: 'Home', icon: '🏠', route: '/(tabs)' },
        { name: 'Explore', icon: '🔍', route: null },
        { name: 'Notifications', icon: '🔔', route: null },
        { name: 'Messages', icon: '✉️', route: null },
        { name: 'Bookmarks', icon: '🔖', route: null },
        { name: 'Profile', icon: '👤', route: '/(tabs)/profile' },
    ];

    return (
        <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoSection}>
                <Text style={styles.logo}>😈 Evil Twitter</Text>
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
                {navigation.map((item) => (
                    <TouchableOpacity
                        key={item.name}
                        style={styles.navItem}
                        onPress={() => item.route ? router.push(item.route as any) : null}
                    >
                        <Text style={styles.navIcon}>{item.icon}</Text>
                        <Text style={styles.navText}>{item.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tweet Button */}
            <View style={styles.tweetSection}>
                <TouchableOpacity style={styles.tweetButton}>
                    <Text style={styles.tweetButtonText}>Tweet</Text>
                </TouchableOpacity>
            </View>

            {/* User Profile */}
            {isAuthenticated && user ? (
                <View style={styles.userSection}>
                    <View style={styles.userProfile}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.avatarText}>
                                {user.user_metadata?.display_name?.charAt(0).toUpperCase() || '😈'}
                            </Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                                {user.user_metadata?.display_name || user.email}
                            </Text>
                            <Text style={styles.userHandle}>
                                @{user.user_metadata?.username || 'user'}
                            </Text>
                        </View>
                        <Text style={styles.moreIcon}>⋯</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.userSection}>
                    <View style={styles.loginPrompt}>
                        <Text style={styles.loginText}>
                            Please log in to access all features
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        height: '100%',
    },
    logoSection: {
        padding: 16,
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    navigation: {
        paddingHorizontal: 16,
        gap: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
    },
    navIcon: {
        fontSize: 24,
    },
    navText: {
        fontSize: 20,
        color: '#fff',
    },
    tweetSection: {
        padding: 16,
    },
    tweetButton: {
        width: '100%',
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        alignItems: 'center',
    },
    tweetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    userProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
    userHandle: {
        fontSize: 14,
        color: '#888',
    },
    moreIcon: {
        color: '#888',
        fontSize: 20,
    },
    loginPrompt: {
        alignItems: 'center',
    },
    loginText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
    },
});
