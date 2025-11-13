import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { WeaponsPanel } from './WeaponsPanel';
import { AppText, AppButton, AppCard, Row, Column } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

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
                <AppText variant="caption" color="secondary" style={styles.searchIcon}>🔍</AppText>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Twitter"
                    placeholderTextColor={colors.textTertiary}
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
            <AppCard bordered>
                <Column gap="md">
                    <View style={styles.sectionHeader}>
                        <AppText variant="h4">What's happening</AppText>
                    </View>
                    <Column style={{ gap: 0 }}>
                        {trendingTopics.map((topic, index) => (
                            <TouchableOpacity key={topic.id} style={styles.trendingItem}>
                                <Row justify="space-between" align="flex-start">
                                    <Column gap="xs" style={{ flex: 1 }}>
                                        <AppText variant="small" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {topic.category} · Trending
                                        </AppText>
                                        <AppText variant="bodyBold">
                                            {topic.topic}
                                        </AppText>
                                        <AppText variant="small" color="secondary">
                                            {topic.tweets_count.toLocaleString()} Tweets
                                        </AppText>
                                    </Column>
                                    <AppText variant="h4" color="secondary">⋯</AppText>
                                </Row>
                            </TouchableOpacity>
                        ))}
                    </Column>
                    <AppButton variant="ghost" size="sm" onPress={() => { }} style={{ margin: spacing.md }}>
                        Show more
                    </AppButton>
                </Column>
            </AppCard>

            {/* Who to follow */}
            <AppCard bordered>
                <Column gap="md">
                    <View style={styles.sectionHeader}>
                        <AppText variant="h4">Who to follow</AppText>
                    </View>
                    <Column style={{ gap: 0 }}>
                        {suggestedUsers.map((user) => (
                            <Row key={user.id} gap="md" align="center" style={styles.suggestedUser}>
                                <View style={styles.userAvatar}>
                                    <AppText variant="bodyBold">
                                        {user.display_name.charAt(0).toUpperCase()}
                                    </AppText>
                                </View>
                                <Column style={{ flex: 1, minWidth: 0 }} gap="xs">
                                    <Row gap="xs" align="center">
                                        <AppText variant="bodyBold">{user.display_name}</AppText>
                                        {user.is_verified && (
                                            <AppText variant="body" color="accent">✓</AppText>
                                        )}
                                    </Row>
                                    <AppText variant="body" color="secondary">@{user.username}</AppText>
                                    {user.bio && (
                                        <AppText variant="small" color="secondary" numberOfLines={2}>
                                            {user.bio}
                                        </AppText>
                                    )}
                                </Column>
                                <AppButton variant="primary" size="sm" onPress={() => { }}>
                                    Follow
                                </AppButton>
                            </Row>
                        ))}
                    </Column>
                    <AppButton variant="ghost" size="sm" onPress={() => { }} style={{ margin: spacing.md }}>
                        Show more
                    </AppButton>
                </Column>
            </AppCard>

            {/* Footer */}
            <Column gap="sm" style={styles.footer}>
                <Row wrap gap="sm">
                    <AppText variant="small" color="secondary">Terms of Service</AppText>
                    <AppText variant="small" color="secondary">Privacy Policy</AppText>
                    <AppText variant="small" color="secondary">Cookie Policy</AppText>
                    <AppText variant="small" color="secondary">Accessibility</AppText>
                    <AppText variant="small" color="secondary">Ads info</AppText>
                    <AppText variant="small" color="secondary">More</AppText>
                </Row>
                <AppText variant="small" color="secondary">© 2024 Evil Twitter, Inc.</AppText>
            </Column>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: spacing.xl,
    },
    searchContainer: {
        position: 'relative',
        marginBottom: spacing.lg,
    },
    searchIcon: {
        position: 'absolute',
        left: spacing.md,
        top: spacing.md,
        zIndex: 1,
    },
    searchInput: {
        backgroundColor: colors.bgElevated,
        color: colors.textPrimary,
        borderRadius: radii.pill,
        paddingVertical: spacing.md,
        paddingLeft: spacing['2xl'],
        paddingRight: spacing.lg,
        ...typography.body,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    weaponsSection: {
        marginTop: spacing.lg,
    },
    sectionHeader: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    trendingItem: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestedUser: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingTop: spacing.lg,
    },
});
