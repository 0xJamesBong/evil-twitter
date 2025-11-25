import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Messages() {
    const conversations = [
        {
            id: '1',
            user: { name: 'John Doe', username: 'johndoe', avatar: 'J' },
            lastMessage: 'Hey, how are you doing?',
            time: '2h',
            unread: true,
        },
        {
            id: '2',
            user: { name: 'Jane Smith', username: 'janesmith', avatar: 'J' },
            lastMessage: 'Thanks for the help with the project!',
            time: '4h',
            unread: false,
        },
        {
            id: '3',
            user: { name: 'Mike Johnson', username: 'mikej', avatar: 'M' },
            lastMessage: 'Can we schedule a meeting for tomorrow?',
            time: '1d',
            unread: true,
        },
        {
            id: '4',
            user: { name: 'Sarah Wilson', username: 'sarahw', avatar: 'S' },
            lastMessage: 'The new feature looks great!',
            time: '2d',
            unread: false,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
                <TouchableOpacity style={styles.newMessageButton}>
                    <Text style={styles.newMessageIcon}>✏️</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <Text style={styles.searchPlaceholder}>Search Direct Messages</Text>
            </View>

            {/* Conversations List */}
            <ScrollView style={styles.conversationsList}>
                {conversations.map((conversation) => (
                    <TouchableOpacity key={conversation.id} style={styles.conversationItem}>
                        <View style={styles.userAvatar}>
                            <Text style={styles.avatarText}>
                                {conversation.user.avatar}
                            </Text>
                        </View>

                        <View style={styles.conversationContent}>
                            <View style={styles.conversationHeader}>
                                <Text style={styles.userName}>{conversation.user.name}</Text>
                                <Text style={styles.timeText}>{conversation.time}</Text>
                            </View>

                            <View style={styles.messagePreview}>
                                <Text
                                    style={[
                                        styles.messageText,
                                        conversation.unread && styles.unreadMessage
                                    ]}
                                    numberOfLines={1}
                                >
                                    {conversation.lastMessage}
                                </Text>
                                {conversation.unread && (
                                    <View style={styles.unreadIndicator} />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    newMessageButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    newMessageIcon: {
        fontSize: 18,
        color: '#1d9bf0',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#16181c',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    searchIcon: {
        fontSize: 16,
        color: '#71767b',
        marginRight: 12,
    },
    searchPlaceholder: {
        color: '#71767b',
        fontSize: 15,
    },
    conversationsList: {
        flex: 1,
    },
    conversationItem: {
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
        fontSize: 18,
        fontWeight: 'bold',
    },
    conversationContent: {
        flex: 1,
        justifyContent: 'center',
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
    },
    timeText: {
        fontSize: 13,
        color: '#71767b',
    },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    messageText: {
        fontSize: 15,
        color: '#71767b',
        flex: 1,
    },
    unreadMessage: {
        color: '#fff',
        fontWeight: 'bold',
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1d9bf0',
        marginLeft: 8,
    },
});
