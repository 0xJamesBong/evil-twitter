import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, AppScreen, Row, Column } from '@/components/ui';
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
        <AppScreen>
            {/* Header */}
            <Column gap="xs" style={styles.header}>
                <AppText variant="h4">Bookmarks</AppText>
                <AppText variant="caption" color="secondary">@username</AppText>
            </Column>

            {/* Bookmarked Tweets */}
            <ScrollView style={styles.tweetsList}>
                {bookmarkedTweets.length > 0 ? (
                    bookmarkedTweets.map((tweet) => (
                        <Row key={tweet.id} gap="md" style={styles.tweetItem}>
                            <View style={styles.userAvatar}>
                                <AppText variant="h4">
                                    {tweet.user.avatar}
                                </AppText>
                            </View>

                            <Column style={{ flex: 1 }} gap="md">
                                <Row gap="xs" align="center">
                                    <AppText variant="bodyBold">{tweet.user.name}</AppText>
                                    <AppText variant="body" color="secondary">@{tweet.user.username}</AppText>
                                    <AppText variant="body" color="secondary">· {tweet.time}</AppText>
                                </Row>

                                <AppText variant="body">{tweet.content}</AppText>

                                <Row justify="space-between" style={{ maxWidth: 425 }}>
                                    <Row gap="xs" align="center" style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18 }}>💬</AppText>
                                        <AppText variant="caption" color="secondary">12</AppText>
                                    </Row>
                                    <Row gap="xs" align="center" style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18 }}>🔄</AppText>
                                        <AppText variant="caption" color="secondary">8</AppText>
                                    </Row>
                                    <Row gap="xs" align="center" style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18 }}>❤️</AppText>
                                        <AppText variant="caption" color="secondary">24</AppText>
                                    </Row>
                                    <View style={styles.actionButton}>
                                        <AppText variant="caption" style={{ fontSize: 18 }}>🔖</AppText>
                                    </View>
                                </Row>
                            </Column>
                        </Row>
                    ))
                ) : (
                    <Column justify="center" align="center" style={styles.emptyState}>
                        <AppText variant="h2" style={{ marginBottom: spacing.lg, textAlign: 'center' }}>Save Tweets for later</AppText>
                        <AppText variant="body" color="secondary" style={{ textAlign: 'center', lineHeight: 20 }}>
                            Don't let the good Tweets get away! Bookmark Tweets to easily find them again in the future.
                        </AppText>
                    </Column>
                )}
            </ScrollView>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
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
    },
    actionButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
        minWidth: 40,
    },
    emptyState: {
        flex: 1,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing['4xl'],
    },
});
