import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
                <TouchableOpacity style={[styles.filterTab, styles.activeTab]}>
                    <Text style={[styles.filterTabText, styles.activeTabText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterTab}>
                    <Text style={styles.filterTabText}>Mentions</Text>
                </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationsList}>
                {notifications.map((notification) => (
                    <TouchableOpacity key={notification.id} style={styles.notificationItem}>
                        <View style={styles.notificationIcon}>
                            <Text style={styles.iconText}>
                                {getNotificationIcon(notification.type)}
                            </Text>
                        </View>

                        <View style={styles.notificationContent}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.avatarText}>
                                    {notification.user.avatar}
                                </Text>
                            </View>

                            <View style={styles.notificationText}>
                                <Text style={styles.notificationMain}>
                                    <Text style={styles.userName}>{notification.user.name}</Text>
                                    <Text style={styles.userHandle}> @{notification.user.username}</Text>
                                    <Text style={styles.actionText}> {getNotificationText(notification.type, notification.user)}</Text>
                                </Text>
                                <Text style={styles.timeText}>{notification.time}</Text>

                                {notification.tweet && (
                                    <View style={styles.tweetPreview}>
                                        <Text style={styles.tweetText}>{notification.tweet}</Text>
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
        backgroundColor: '#000',
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
    filterTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    filterTab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#1d9bf0',
    },
    filterTabText: {
        fontSize: 15,
        color: '#71767b',
        fontWeight: 'bold',
    },
    activeTabText: {
        color: '#1d9bf0',
    },
    notificationsList: {
        flex: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    notificationIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1d9bf0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 16,
    },
    notificationContent: {
        flex: 1,
        flexDirection: 'row',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    notificationText: {
        flex: 1,
    },
    notificationMain: {
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 4,
    },
    userName: {
        color: '#fff',
        fontWeight: 'bold',
    },
    userHandle: {
        color: '#71767b',
    },
    actionText: {
        color: '#71767b',
    },
    timeText: {
        fontSize: 13,
        color: '#71767b',
        marginBottom: 8,
    },
    tweetPreview: {
        backgroundColor: '#16181c',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2f3336',
    },
    tweetText: {
        color: '#e7e9ea',
        fontSize: 15,
        lineHeight: 20,
    },
});
