import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText, AppScreen, Row, Column, AppCard } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

export default function Notifications() {
    const notifications = [
        {
            id: '1',
            type: 'like',
            user: { name: 'John Doe', username: 'johndoe', avatar: 'J' },
            tweet: 'Just shipped a new feature! 🚀',
            time: '2h',
        },
        {
            id: '2',
            type: 'retweet',
            user: { name: 'Jane Smith', username: 'janesmith', avatar: 'J' },
            tweet: 'Great article about React hooks',
            time: '4h',
        },
        {
            id: '3',
            type: 'follow',
            user: { name: 'Mike Johnson', username: 'mikej', avatar: 'M' },
            tweet: null,
            time: '6h',
        },
        {
            id: '4',
            type: 'reply',
            user: { name: 'Sarah Wilson', username: 'sarahw', avatar: 'S' },
            tweet: 'Thanks for the tip!',
            time: '8h',
        },
    ];

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like': return '❤️';
            case 'retweet': return '🔄';
            case 'follow': return '👤';
            case 'reply': return '💬';
            default: return '🔔';
        }
    };

    const getNotificationText = (type: string, user: any) => {
        switch (type) {
            case 'like': return `liked your Tweet`;
            case 'retweet': return `Retweeted`;
            case 'follow': return `followed you`;
            case 'reply': return `replied to your Tweet`;
            default: return 'notified you';
        }
    };

    return (
        <AppScreen>
            {/* Header */}
            <Row justify="space-between" align="center" style={styles.header}>
                <AppText variant="h4">Notifications</AppText>
            </Row>

            {/* Filter Tabs */}
            <Row style={styles.filterTabs}>
                <TouchableOpacity style={[styles.filterTab, styles.activeTab]}>
                    <AppText variant="bodyBold" color="primary">All</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterTab}>
                    <AppText variant="bodyBold" color="secondary">Mentions</AppText>
                </TouchableOpacity>
            </Row>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
                {notifications.map((notification) => (
                    <TouchableOpacity key={notification.id} style={styles.notificationItem}>
                        <Row gap="md" align="flex-start">
                            <View style={styles.notificationIcon}>
                                <AppText variant="body" style={{ fontSize: 16 }}>
                                    {getNotificationIcon(notification.type)}
                                </AppText>
                            </View>

                            <Row gap="md" style={{ flex: 1 }}>
                                <View style={styles.userAvatar}>
                                    <AppText variant="bodyBold">
                                        {notification.user.avatar}
                                    </AppText>
                                </View>

                                <Column style={{ flex: 1 }} gap="xs">
                                    <AppText variant="body">
                                        <AppText variant="bodyBold">{notification.user.name}</AppText>
                                        <AppText variant="body" color="secondary"> @{notification.user.username}</AppText>
                                        <AppText variant="body" color="secondary"> {getNotificationText(notification.type, notification.user)}</AppText>
                                    </AppText>
                                    <AppText variant="caption" color="secondary">{notification.time}</AppText>

                                    {notification.tweet && (
                                        <AppCard padding bordered style={styles.tweetPreview}>
                                            <AppText variant="body">{notification.tweet}</AppText>
                                        </AppCard>
                                    )}
                                </Column>
                            </Row>
                        </Row>
                    </TouchableOpacity>
                ))}
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
    filterTabs: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterTab: {
        flex: 1,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: colors.accent,
    },
    notificationsList: {
        flex: 1,
    },
    notificationItem: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    notificationIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tweetPreview: {
        marginTop: spacing.sm,
    },
});
