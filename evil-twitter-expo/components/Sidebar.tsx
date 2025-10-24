import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function Sidebar() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();

    const navigation = [
        { name: 'Home', icon: '🏠', route: '/(tabs)' },
        // { name: 'Explore', icon: '🔍', route: '/(tabs)/explore' },
        // { name: 'Notifications', icon: '🔔', route: '/(tabs)/notifications' },
        // { name: 'Messages', icon: '✉️', route: '/(tabs)/messages' },
        // { name: 'Bookmarks', icon: '🔖', route: '/(tabs)/bookmarks' },
        { name: 'Profile', icon: '👤', route: '/(tabs)/profile' },
        { name: 'Shop', icon: '🛒', route: '/(tabs)/shop' },
    ];

    return (
        <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoSection}>
                <TouchableOpacity style={styles.logoButton}>
                    <Text style={styles.logo}>😈</Text>
                </TouchableOpacity>
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

            {/* User Profile - Bottom */}
            <View style={styles.userSection}>
                {isAuthenticated && user ? (
                    <TouchableOpacity style={styles.userProfile}>
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
                    </TouchableOpacity>
                ) : (
                    <View style={styles.loginPrompt}>
                        <Text style={styles.loginText}>
                            Please log in to access all features
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        height: '100%',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    logoSection: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    logoButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        fontSize: 28,
    },
    navigation: {
        flex: 1,
        paddingVertical: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 25,
        marginVertical: 2,
        minHeight: 50,
    },
    navIcon: {
        fontSize: 26,
        marginRight: 20,
        width: 26,
        textAlign: 'center',
    },
    navText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: '400',
    },
    tweetSection: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    tweetButton: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 25,
        alignItems: 'center',
        minHeight: 50,
        justifyContent: 'center',
    },
    tweetButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    userSection: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginTop: 'auto',
    },
    userProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 25,
        minHeight: 60,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    userHandle: {
        fontSize: 15,
        color: '#71767b',
    },
    moreIcon: {
        color: '#71767b',
        fontSize: 20,
        marginLeft: 8,
    },
    loginPrompt: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    loginText: {
        color: '#71767b',
        fontSize: 15,
        textAlign: 'center',
    },
});
