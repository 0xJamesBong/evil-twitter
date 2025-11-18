import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
                <Text style={styles.headerTitle}>Bookmarks</Text>
                <Text style={styles.headerSubtitle}>@username</Text>
            </View>

            {/* Bookmarked Tweets */}
            <ScrollView style={styles.tweetsList}>
                {bookmarkedTweets.length > 0 ? (
                    bookmarkedTweets.map((tweet) => (
                        <View key={tweet.id} style={styles.tweetItem}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.avatarText}>
                                    {tweet.user.avatar}
                                </Text>
                            </View>

                            <View style={styles.tweetContent}>
                                <View style={styles.tweetHeader}>
                                    <Text style={styles.userName}>{tweet.user.name}</Text>
                                    <Text style={styles.userHandle}>@{tweet.user.username}</Text>
                                    <Text style={styles.timeText}>· {tweet.time}</Text>
                                </View>

                                <Text style={styles.tweetText}>{tweet.content}</Text>

                                <View style={styles.tweetActions}>
                                    <View style={styles.actionButton}>
                                        <Text style={styles.actionIcon}>💬</Text>
                                        <Text style={styles.actionText}>12</Text>
                                    </View>
                                    <View style={styles.actionButton}>
                                        <Text style={styles.actionIcon}>🔄</Text>
                                        <Text style={styles.actionText}>8</Text>
                                    </View>
                                    <View style={styles.actionButton}>
                                        <Text style={styles.actionIcon}>❤️</Text>
                                        <Text style={styles.actionText}>24</Text>
                                    </View>
                                    <View style={styles.actionButton}>
                                        <Text style={styles.actionIcon}>🔖</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>Save Tweets for later</Text>
                        <Text style={styles.emptyText}>
                            Don't let the good Tweets get away! Bookmark Tweets to easily find them again in the future.
                        </Text>
                    </View>
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
    headerSubtitle: {
        fontSize: 13,
        color: '#71767b',
        marginTop: 2,
    },
    tweetsList: {
        flex: 1,
    },
    tweetItem: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    tweetContent: {
        flex: 1,
    },
    tweetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
        marginRight: 4,
    },
    userHandle: {
        fontSize: 15,
        color: '#71767b',
        marginRight: 4,
    },
    timeText: {
        fontSize: 15,
        color: '#71767b',
    },
    tweetText: {
        fontSize: 15,
        color: '#fff',
        lineHeight: 20,
        marginBottom: 12,
    },
    tweetActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        maxWidth: 425,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        minWidth: 40,
    },
    actionIcon: {
        fontSize: 18,
        marginRight: 4,
    },
    actionText: {
        color: '#71767b',
        fontSize: 13,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#71767b',
        textAlign: 'center',
        lineHeight: 20,
    },
});
