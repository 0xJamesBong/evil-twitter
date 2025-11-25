import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WeaponsPanel } from './WeaponsPanel';

interface TrendingTopic {
    id: string;
    topic: string;
    tweets_count: number;
    category?: string;
}

interface SuggestedUser {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified: boolean;
    bio?: string;
    followers_count: number;
}

export function RightSidebar() {
    const { user } = useBackendUserStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);

    useEffect(() => {
        // Mock data - in a real app, this would come from the API
        setTrendingTopics([
            { id: '1', topic: '#Rust', tweets_count: 12500, category: 'Technology' },
            { id: '2', topic: '#WebDev', tweets_count: 8900, category: 'Technology' },
            { id: '3', topic: '#AI', tweets_count: 15600, category: 'Technology' },
            { id: '4', topic: '#JavaScript', tweets_count: 22000, category: 'Technology' },
            { id: '5', topic: '#TypeScript', tweets_count: 9800, category: 'Technology' },
        ]);

        setSuggestedUsers([
            {
                id: '1',
                username: 'rustlang',
                display_name: 'Rust Language',
                is_verified: true,
                bio: 'A language empowering everyone to build reliable and efficient software.',
                followers_count: 125000,
            },
            {
                id: '2',
                username: 'vercel',
                display_name: 'Vercel',
                is_verified: true,
                bio: 'The platform for frontend developers. Deploy instantly, scale automatically.',
                followers_count: 89000,
            },
            {
                id: '3',
                username: 'nextjs',
                display_name: 'Next.js',
                is_verified: true,
                bio: 'The React Framework for Production',
                followers_count: 156000,
            },
        ]);
    }, []);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Search */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Twitter"
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Weapons Arsenal */}
            {user && (
                <View style={styles.weaponsSection}>
                    <WeaponsPanel userId={user._id?.$oid} maxDisplay={2} />
                </View>
            )}

            {/* What's happening */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>What's happening</Text>
                </View>
                <View style={styles.sectionContent}>
                    {trendingTopics.map((topic, index) => (
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
                </View>
                <TouchableOpacity style={styles.showMoreButton}>
                    <Text style={styles.showMoreText}>Show more</Text>
                </TouchableOpacity>
            </View>

            {/* Who to follow */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Who to follow</Text>
                </View>
                <View style={styles.sectionContent}>
                    {suggestedUsers.map((user) => (
                        <View key={user.id} style={styles.suggestedUser}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.avatarText}>
                                    {user.display_name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <View style={styles.userNameRow}>
                                    <Text style={styles.userName}>{user.display_name}</Text>
                                    {user.is_verified && (
                                        <Text style={styles.verifiedIcon}>✓</Text>
                                    )}
                                </View>
                                <Text style={styles.userHandle}>@{user.username}</Text>
                                {user.bio && (
                                    <Text style={styles.userBio} numberOfLines={2}>
                                        {user.bio}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity style={styles.followButton}>
                                <Text style={styles.followButtonText}>Follow</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
                <TouchableOpacity style={styles.showMoreButton}>
                    <Text style={styles.showMoreText}>Show more</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerLinks}>
                    <Text style={styles.footerLink}>Terms of Service</Text>
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                    <Text style={styles.footerLink}>Cookie Policy</Text>
                    <Text style={styles.footerLink}>Accessibility</Text>
                    <Text style={styles.footerLink}>Ads info</Text>
                    <Text style={styles.footerLink}>More</Text>
                </View>
                <Text style={styles.copyright}>© 2024 Evil Twitter, Inc.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 24,
    },
    searchContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        top: 12,
        fontSize: 16,
        color: '#71767b',
        zIndex: 1,
    },
    searchInput: {
        backgroundColor: '#16181c',
        color: '#fff',
        borderRadius: 24,
        paddingVertical: 12,
        paddingLeft: 40,
        paddingRight: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    weaponsSection: {
        marginTop: 16,
    },
    section: {
        backgroundColor: '#16181c',
        borderRadius: 16,
        overflow: 'hidden',
    },
    sectionHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    sectionContent: {
        gap: 0,
    },
    trendingItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 16,
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
    },
    suggestedUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    verifiedIcon: {
        color: '#1DA1F2',
        fontSize: 16,
    },
    userHandle: {
        fontSize: 15,
        color: '#71767b',
        marginBottom: 4,
    },
    userBio: {
        fontSize: 15,
        color: '#e7e9ea',
        lineHeight: 20,
    },
    followButton: {
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    followButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
    },
    showMoreButton: {
        padding: 16,
    },
    showMoreText: {
        color: '#1d9bf0',
        fontSize: 15,
    },
    footer: {
        paddingTop: 16,
        gap: 8,
    },
    footerLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    footerLink: {
        color: '#71767b',
        fontSize: 13,
    },
    copyright: {
        color: '#71767b',
        fontSize: 13,
    },
});
