import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Timeline } from '@/components/Timeline';
import { RightSidebar } from '@/components/RightSidebar';
import { WeaponsPanel } from '@/components/WeaponsPanel';

export default function HomePage() {
    const { isAuthenticated, initialized } = useAuthStore();
    const { user: backendUser, fetchUser, createUser } = useBackendUserStore();
    const { fetchTweets } = useTweetsStore();

    useEffect(() => {
        if (initialized && isAuthenticated && !backendUser) {
            // Try to fetch existing user, create if doesn't exist
            fetchUser(isAuthenticated).catch(() => {
                // User doesn't exist, create them
                createUser({
                    supabase_id: isAuthenticated,
                    username: 'user',
                    display_name: 'User',
                    avatar_url: undefined,
                    bio: '',
                    follower_count: 0,
                    following_count: 0,
                    dollar_rate: 1.0,
                    weapon_ids: [],
                });
            });
        }
    }, [initialized, isAuthenticated, backendUser, fetchUser, createUser]);

    useEffect(() => {
        if (backendUser) {
            fetchTweets();
        }
    }, [backendUser, fetchTweets]);

    if (!initialized) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingText}>Loading...</View>
            </View>
        );
    }

    // For mobile, use the tab layout
    if (Platform.OS !== 'web') {
        return null; // This will be handled by the tab layout
    }

    // Web layout - replicate the frontend structure
    return (
        <View style={styles.container}>
            <Navbar />

            <View style={styles.mainContent}>
                {/* Left Sidebar */}
                <View style={styles.leftSidebar}>
                    <Sidebar />
                </View>

                {/* Main Content */}
                <View style={styles.centerContent}>
                    <Timeline />
                </View>

                {/* Right Sidebar - Weapons */}
                <View style={styles.rightSidebar}>
                    <RightSidebar />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        minHeight: '100vh',
        backgroundColor: '#000',
    },
    loadingContainer: {
        minHeight: '100vh',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 20,
    },
    mainContent: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        flexDirection: 'row',
        paddingTop: 64, // Account for fixed navbar
        minHeight: 'calc(100vh - 64px)',
    },
    leftSidebar: {
        width: 256,
        position: 'fixed',
        left: 0,
        top: 64,
        height: '100%',
        borderRightWidth: 1,
        borderRightColor: '#333',
    },
    centerContent: {
        flex: 1,
        marginLeft: 256,
        marginRight: 320,
    },
    rightSidebar: {
        width: 320,
        position: 'fixed',
        right: 0,
        top: 64,
        height: '100%',
        borderLeftWidth: 1,
        borderLeftColor: '#333',
        overflow: 'scroll',
        padding: 16,
    },
});
