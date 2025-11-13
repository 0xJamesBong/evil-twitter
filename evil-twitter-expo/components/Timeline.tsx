import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';
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
                <AppText variant="h3">Loading...</AppText>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <AppText variant="bodyLarge" color="danger">Error: {error}</AppText>
                <AppButton variant="primary" onPress={fetchTweets}>
                    Try Again
                </AppButton>
            </View>
        );
    }

    // Create header component for FlatList
    const ListHeader = () => (
        <View>
            {/* Header */}
            <View style={styles.header}>
                <AppText variant="h4">Home</AppText>
            </View>

            {/* Compose Tweet */}
            {isAuthenticated ? (
                <View style={styles.composeSection}>
                    <ComposeTweet />
                </View>
            ) : (
                <View style={styles.welcomeSection}>
                    <AppText variant="h2">Welcome to Evil Twitter</AppText>
                    <AppText variant="bodyLarge" color="tertiary">
                        Sign in to see tweets and join the conversation!
                    </AppText>
                    <SignInButton />
                </View>
            )}
        </View>
    );

    // Create empty state component
    const EmptyState = () => (
        <View style={styles.emptyState}>
            <AppText variant="bodyLarge" color="tertiary">
                {isAuthenticated ? 'No tweets yet. Be the first to tweet!' : 'Sign in to see tweets'}
            </AppText>
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        position: 'sticky',
        top: 0,
        backgroundColor: colors.bg,
        zIndex: 10,
    },
    headerTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    composeSection: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    welcomeSection: {
        padding: spacing['2xl'],
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    welcomeTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
    },
    welcomeText: {
        ...typography.bodyLarge,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    emptyState: {
        padding: spacing['2xl'],
        alignItems: 'center',
    },
    emptyText: {
        ...typography.bodyLarge,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    tweetContainer: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    text: {
        ...typography.bodyLarge,
        color: colors.textPrimary,
    },
});
