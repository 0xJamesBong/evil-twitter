import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Explore() {
    const trendingTopics = [
        { id: '1', topic: '#Rust', tweets_count: 12500, category: 'Technology' },
        { id: '2', topic: '#WebDev', tweets_count: 8900, category: 'Technology' },
        { id: '3', topic: '#AI', tweets_count: 15600, category: 'Technology' },
        { id: '4', topic: '#JavaScript', tweets_count: 22000, category: 'Technology' },
        { id: '5', topic: '#TypeScript', tweets_count: 9800, category: 'Technology' },
        { id: '6', topic: '#React', tweets_count: 18000, category: 'Technology' },
        { id: '7', topic: '#NodeJS', tweets_count: 12000, category: 'Technology' },
        { id: '8', topic: '#Python', tweets_count: 25000, category: 'Technology' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <Text style={styles.searchPlaceholder}>Search Twitter</Text>
            </View>

            {/* Trending Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>What's happening</Text>
                <ScrollView style={styles.trendingList}>
                    {trendingTopics.map((topic) => (
                        <TouchableOpacity key={topic.id} style={styles.trendingItem}>
                            <View style={styles.trendingContent}>
                                <Text style={styles.trendingCategory}>
                                    {topic.category} · Trending
                                </Text>
                                <Text style={styles.trendingTopic}>
                                    {topic.topic}
                                </Text>
                                <Text style={styles.trendingCount}>
                                    {topic.tweets_count.toLocaleString()} Tweets
                                </Text>
                            </View>
                            <Text style={styles.moreIcon}>⋯</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
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
    section: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    trendingList: {
        flex: 1,
    },
    trendingItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    trendingContent: {
        flex: 1,
    },
    trendingCategory: {
        fontSize: 13,
        color: '#71767b',
        marginBottom: 4,
    },
    trendingTopic: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    trendingCount: {
        fontSize: 13,
        color: '#71767b',
    },
    moreIcon: {
        color: '#71767b',
        fontSize: 18,
        padding: 8,
    },
});
