import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ComposeTweet } from './ComposeTweet';
import { SignInButton } from './SignInButton';
import { TweetCard } from './TweetCard';

export function Timeline() {
    const { isAuthenticated } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();
    const {
        tweets,
        loading,
        error,
        fetchTweets,
    } = useTweetsStore();
    const { fetchUserWeapons } = useWeaponsStore();
    const { height } = useWindowDimensions();

    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchTweets();
            fetchUserWeapons(backendUser._id.$oid);
        }
    }, [backendUser, fetchTweets, fetchUserWeapons]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <TouchableOpacity onPress={fetchTweets} style={styles.retryButton}>
                    <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Create header component for FlatList
    const ListHeader = () => (
        <View>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Home</Text>
            </View>

            {/* Compose Tweet */}
            {isAuthenticated ? (
                <View style={styles.composeSection}>
                    <ComposeTweet />
                </View>
            ) : (
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Welcome to Evil Twitter</Text>
                    <Text style={styles.welcomeText}>
                        Sign in to see tweets and join the conversation!
                    </Text>
                    <SignInButton />
                </View>
            )}
        </View>
    );

    // Create empty state component
    const EmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
                {isAuthenticated ? 'No tweets yet. Be the first to tweet!' : 'Sign in to see tweets'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                style={[styles.scrollView, { maxHeight: height - 200 }]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
            >
                <ListHeader />
                {tweets.length === 0 ? (
                    <EmptyState />
                ) : (
                    tweets.map((tweet) => (
                        <View key={tweet._id.$oid} style={styles.tweetContainer}>
                            <TweetCard tweet={tweet} />
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 80, // Space for FAB
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 400,
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
    },
    errorContainer: {
        padding: 16,
        alignItems: 'center',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    composeSection: {
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    welcomeSection: {
        padding: 32,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    welcomeText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
    },
    tweetContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    text: {
        color: '#fff',
        fontSize: 16,
    },
});
