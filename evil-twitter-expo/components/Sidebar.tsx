import { AuthModal } from '@/components/AuthModal';
import { SignInButton } from '@/components/SignInButton';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SidebarProps {
    compact?: boolean;
}

export function Sidebar({ compact = false }: SidebarProps) {
    const router = useRouter();
    const { isAuthenticated, user, logout } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();
    const [showAuthModal, setShowAuthModal] = useState(false);

    const navigation = [
        { name: 'Home', icon: '🏠', route: '/(tabs)' },
        // { name: 'Explore', icon: '🔍', route: '/(tabs)/explore' },
        // { name: 'Notifications', icon: '🔔', route: '/(tabs)/notifications' },
        // { name: 'Messages', icon: '✉️', route: '/(tabs)/messages' },
        // { name: 'Bookmarks', icon: '🔖', route: '/(tabs)/bookmarks' },
        { name: 'Profile', icon: '👤', route: '/(tabs)/profile' },
        { name: 'Shop', icon: '🛒', route: '/(tabs)/shop' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
    };

    return (
        <View style={[styles.sidebarContainer, compact && styles.sidebarContainerCompact]}>
            <View>
                <TouchableOpacity onPress={() => router.push('/(tabs)' as any)}>
                    <Text style={[styles.logo, compact && styles.logoCompact]}>ET</Text>
                    {!compact ? (
                        <Text style={styles.logoSubtitle}>Evil Twitter</Text>
                    ) : null}
                </TouchableOpacity>

                <View style={styles.navList}>
                    {navigation.map((item) => (
                        <TouchableOpacity
                            key={item.name}
                            style={styles.navItem}
                            onPress={() => router.push(item.route as any)}
                        >
                            <Text style={styles.navIcon}>{item.icon}</Text>
                            {!compact ? <Text style={styles.navLabel}>{item.name}</Text> : null}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.sidebarFooter}>
                <TouchableOpacity style={styles.tweetButton} activeOpacity={0.8}>
                    <Text style={styles.tweetButtonText}>{compact ? '✍️' : 'Tweet'}</Text>
                </TouchableOpacity>

                {isAuthenticated && backendUser ? (
                    <View style={styles.profileCard}>
                        <TouchableOpacity
                            style={styles.profileLink}
                            onPress={() => router.push('/(tabs)/profile' as any)}
                        >
                            <View style={styles.profileAvatar}>
                                <Text style={styles.profileAvatarText}>
                                    {backendUser.display_name?.charAt(0).toUpperCase() || '😈'}
                                </Text>
                            </View>
                            {!compact ? (
                                <View style={styles.profileMeta}>
                                    <Text style={styles.profileName}>
                                        {backendUser.display_name || 'User'}
                                    </Text>
                                    <Text style={styles.profileHandle}>
                                        @{backendUser.username || 'user'}
                                    </Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                        {!compact ? (
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonCompact}>
                                <Text style={styles.logoutIcon}>🚪</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.authSection}>
                        {!compact ? (
                            <SignInButton
                                style={styles.loginButton}
                                textStyle={styles.loginText}
                                text="Sign In"
                                onAuthSuccess={handleAuthSuccess}
                            />
                        ) : (
                            <TouchableOpacity
                                style={styles.loginButtonCompact}
                                onPress={() => setShowAuthModal(true)}
                            >
                                <Text style={styles.loginIcon}>🔑</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={handleAuthSuccess}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sidebarContainer: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 24,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'space-between',
        minHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
    },
    sidebarContainerCompact: {
        paddingHorizontal: 12,
    },
    logo: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    logoCompact: {
        textAlign: 'center',
    },
    logoSubtitle: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 4,
        marginBottom: 24,
    },
    navList: {
        gap: 12,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 999,
        gap: 16,
    },
    navIcon: {
        fontSize: 22,
    },
    navLabel: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '600',
    },
    sidebarFooter: {
        gap: 20,
    },
    tweetButton: {
        backgroundColor: '#1d9bf0',
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
    },
    tweetButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 12,
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileAvatarText: {
        color: '#fff',
        fontWeight: '700',
    },
    profileMeta: {
        flex: 1,
    },
    profileName: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    profileHandle: {
        color: '#9ca3af',
        marginTop: 2,
    },
    profileMenu: {
        color: '#9ca3af',
        fontSize: 18,
    },
    profileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    logoutButton: {
        backgroundColor: '#ef4444',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    logoutText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    logoutButtonCompact: {
        backgroundColor: '#ef4444',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutIcon: {
        fontSize: 16,
    },
    authSection: {
        alignItems: 'center',
    },
    loginButton: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    loginText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loginButtonCompact: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    loginIcon: {
        fontSize: 18,
    },
});