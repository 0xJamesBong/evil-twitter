import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { SignInButton } from './SignInButton';

export function Navbar() {
    const router = useRouter();
    const { isAuthenticated, user, logout } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            {/* Navbar Content */}
            <View style={styles.navbar}>
                <View style={styles.navbarContent}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logo}>😈 Evil Twitter</Text>
                    </View>

                    {/* Navigation Items */}
                    <View style={styles.navItems}>
                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => router.push('/(tabs)' as any)}
                        >
                            <Text style={styles.navIcon}>🏠</Text>
                            <Text style={styles.navText}>Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <Text style={styles.navIcon}>🔍</Text>
                            <Text style={styles.navText}>Explore</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <Text style={styles.navIcon}>🔔</Text>
                            <Text style={styles.navText}>Notifications</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <Text style={styles.navIcon}>✉️</Text>
                            <Text style={styles.navText}>Messages</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.navItem}>
                            <Text style={styles.navIcon}>🔖</Text>
                            <Text style={styles.navText}>Bookmarks</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.navItem}
                            onPress={() => router.push('/(tabs)/shop' as any)}
                        >
                            <Text style={styles.navIcon}>🛒</Text>
                            <Text style={styles.navText}>Shop</Text>
                        </TouchableOpacity>
                    </View>

                    {/* User Section */}
                    <View style={styles.userSection}>
                        {isAuthenticated && backendUser ? (
                            <View style={styles.userInfo}>
                                <TouchableOpacity
                                    style={styles.userProfileLink}
                                    onPress={() => router.push('/(tabs)/profile' as any)}
                                >
                                    <View style={styles.userAvatar}>
                                        <Text style={styles.avatarText}>
                                            {backendUser.display_name?.charAt(0).toUpperCase() || '😈'}
                                        </Text>
                                    </View>
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userName}>
                                            {backendUser.display_name || 'User'}
                                        </Text>
                                        <Text style={styles.userHandle}>
                                            @{backendUser.username || 'user'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                    <Text style={styles.logoutText}>Logout</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <SignInButton
                                style={styles.loginButton}
                                textStyle={styles.loginText}
                            />
                        )}
                    </View>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    navbar: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        zIndex: 1000,
    },
    navbarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        paddingHorizontal: 16,
        maxWidth: 1200,
        marginHorizontal: 'auto',
    },
    logoContainer: {
        flex: 1,
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    navItems: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        flex: 2,
        justifyContent: 'center',
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    navIcon: {
        fontSize: 20,
    },
    navText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    userSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userProfileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1DA1F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userDetails: {
        alignItems: 'flex-start',
    },
    userName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    userHandle: {
        color: '#888',
        fontSize: 12,
    },
    logoutButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#333',
    },
    logoutText: {
        color: '#fff',
        fontSize: 12,
    },
    loginButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    loginText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
