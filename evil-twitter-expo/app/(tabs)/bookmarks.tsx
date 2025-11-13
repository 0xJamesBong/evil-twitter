import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

export default function Bookmarks() {
    const bookmarkedTweets = [
        {
            id: '1',
            user: { name: 'John Doe', username: 'johndoe', avatar: 'J' },
            content: 'Just shipped a new feature! The team worked really hard on this one. 🚀',
            time: '2h',
        },
        {
            id: '2',
            user: { name: 'Jane Smith', username: 'janesmith', avatar: 'J' },
            content: 'Great article about React hooks and how they can improve your code organization.',
            time: '4h',
        },
        {
            id: '3',
            user: { name: 'Mike Johnson', username: 'mikej', avatar: 'M' },
            content: 'TypeScript is a game changer for large-scale applications. The type safety is incredible!',
            time: '1d',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <AppText variant="h4">Bookmarks</AppText>
                <AppText variant="caption" color="secondary" style={{ marginTop: spacing.xs }}>@username</AppText>
            </View>

            {/* Bookmarked Tweets */}
            <ScrollView style={styles.tweetsList}>
                {bookmarkedTweets.length > 0 ? (
                    bookmarkedTweets.map((tweet) => (
                        <View key={tweet.id} style={styles.tweetItem}>
                            <View style={styles.userAvatar}>
                                <AppText variant="h4">
                                    {tweet.user.avatar}
                                </AppText>
                            </View>

                            <View style={styles.tweetContent}>
                                <View style={styles.tweetHeader}>
                                    <AppText variant="bodyBold">{tweet.user.name}</AppText>
                                    <AppText variant="body" color="secondary">@{tweet.user.username}</AppText>
                                    <AppText variant="body" color="secondary">· {tweet.time}</AppText>
                                </View>

                                <AppText variant="body" style={{ marginBottom: spacing.md }}>{tweet.content}</AppText>

                                <View style={styles.tweetActions}>
                                    <View style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18, marginRight: spacing.xs }}>💬</AppText>
                                        <AppText variant="caption" color="secondary">12</AppText>
                                    </View>
                                    <View style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18, marginRight: spacing.xs }}>🔄</AppText>
                                        <AppText variant="caption" color="secondary">8</AppText>
                                    </View>
                                    <View style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18, marginRight: spacing.xs }}>❤️</AppText>
                                        <AppText variant="caption" color="secondary">24</AppText>
                                    </View>
                                    <View style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18 }}>🔖</AppText>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <AppText variant="h2" style={{ marginBottom: spacing.lg, textAlign: 'center' }}>Save Tweets for later</AppText>
                        <AppText variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 20 }}>
                            Don't let the good Tweets get away! Bookmark Tweets to easily find them again in the future.
                        </AppText>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
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
    tweetsList: {
        flex: 1,
    },
    tweetItem: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    tweetContent: {
        flex: 1,
    },
    tweetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
        gap: spacing.xs,
    },
    tweetActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        maxWidth: 425,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
        minWidth: 40,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing['4xl'],
    },
});
