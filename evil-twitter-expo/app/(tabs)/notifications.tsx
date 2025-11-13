import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/components/ui';
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
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <AppText variant="h4">Notifications</AppText>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
                <TouchableOpacity style={[styles.filterTab, styles.activeTab]}>
                    <AppText variant="bodyBold" color="primary">All</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterTab}>
                    <AppText variant="bodyBold" color="secondary">Mentions</AppText>
                </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
                {notifications.map((notification) => (
                    <TouchableOpacity key={notification.id} style={styles.notificationItem}>
                        <View style={styles.notificationIcon}>
                            <AppText variant="body" style={{ fontSize: 16 }}>
                                {getNotificationIcon(notification.type)}
                            </AppText>
                        </View>

                        <View style={styles.notificationContent}>
                            <View style={styles.userAvatar}>
                                <AppText variant="bodyBold">
                                    {notification.user.avatar}
                                </AppText>
                            </View>

                            <View style={styles.notificationText}>
                                <AppText variant="body" style={{ marginBottom: spacing.xs }}>
                                    <AppText variant="bodyBold">{notification.user.name}</AppText>
                                    <AppText variant="body" color="secondary"> @{notification.user.username}</AppText>
                                    <AppText variant="body" color="secondary"> {getNotificationText(notification.type, notification.user)}</AppText>
                                </AppText>
                                <AppText variant="caption" color="secondary" style={{ marginBottom: spacing.sm }}>{notification.time}</AppText>

                                {notification.tweet && (
                                    <View style={styles.tweetPreview}>
                                        <AppText variant="body">{notification.tweet}</AppText>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
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
    filterTabs: {
        flexDirection: 'row',
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
        flexDirection: 'row',
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
        marginRight: spacing.md,
    },
    notificationContent: {
        flex: 1,
        flexDirection: 'row',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    notificationText: {
        flex: 1,
    },
    tweetPreview: {
        backgroundColor: colors.bgElevated,
        borderRadius: radii.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: spacing.sm,
    },
});
