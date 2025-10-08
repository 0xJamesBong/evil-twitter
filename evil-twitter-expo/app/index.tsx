import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { Timeline } from '@/components/Timeline';

export default function HomePage() {
    const { user: authUser, isAuthenticated, initialized } = useAuthStore();
    const { user: backendUser, fetchUser, createUser } = useBackendUserStore();
    const { fetchTweets } = useTweetsStore();

    useEffect(() => {
        if (initialized && isAuthenticated && authUser && !backendUser) {
            // Try to fetch existing user, create if doesn't exist
            fetchUser(authUser.id).catch(() => {
                // User doesn't exist, create them
                createUser(authUser);
            });
        }
    }, [initialized, isAuthenticated, authUser, backendUser, fetchUser, createUser]);

    useEffect(() => {
        if (backendUser) {
            fetchTweets();
        }
    }, [backendUser, fetchTweets]);

    if (!initialized) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    // Layout is handled at root level - just return content
    return (
        <View style={styles.content}>
            <Timeline />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: 16,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        color: '#fff',
        fontSize: 20,
    },
});
