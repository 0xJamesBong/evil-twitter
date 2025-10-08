import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { TweetCard } from './TweetCard';
import { ComposeTweet } from './ComposeTweet';
import { useAuthStore } from '@/lib/stores/authStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';

export function Timeline() {
    const { isAuthenticated } = useAuthStore();
    const { user: backendUser } = useBackendUserStore();
    const {
        tweets,
        loading,
        error,
        fetchTweets,
    } = useTweetsStore();

    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchTweets();
        }
    }, [fetchTweets, backendUser]);

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

    return (
        <View style={styles.container}>
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
                    <TouchableOpacity style={styles.signInButton}>
                        <Text style={styles.signInText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Tweets */}
            <View style={styles.tweetsSection}>
                {tweets.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>
                            {isAuthenticated ? 'No tweets yet. Be the first to tweet!' : 'Sign in to see tweets'}
                        </Text>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {tweets.map((tweet) => (
                            <View key={tweet._id.$oid} style={styles.tweetContainer}>
                                <TweetCard tweet={tweet} />
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    composeSection: {
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    welcomeSection: {
        padding: 32,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
    signInButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
    },
    signInText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tweetsSection: {
        flex: 1,
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
        borderBottomColor: '#333',
    },
});
