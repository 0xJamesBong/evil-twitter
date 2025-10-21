import { TweetCard } from '@/components/TweetCard';
import { Tweet } from '@/lib/stores/tweetsStore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Tweet source configuration
export interface TweetSource {
    // Function to fetch tweets
    fetchTweets: () => Promise<Tweet[]>;
    // Function to refresh tweets
    refreshTweets?: () => Promise<Tweet[]>;
    // Function to load more tweets (for pagination)
    loadMoreTweets?: () => Promise<Tweet[]>;
    // Whether to show loading state
    showLoading?: boolean;
    // Whether to show error state
    showError?: boolean;
    // Error message
    errorMessage?: string;
    // Whether to show empty state
    showEmpty?: boolean;
    // Empty state message
    emptyMessage?: string;
    // Whether to show refresh control
    showRefreshControl?: boolean;
    // Whether to show load more button
    showLoadMore?: boolean;
}

interface TweetWallProps {
    // Tweet source configuration
    tweetSource: TweetSource;
    // Display configuration
    maxTweets?: number; // Limit number of tweets to show
    showHeader?: boolean; // Show header section
    headerTitle?: string; // Header title
    headerComponent?: React.ReactNode; // Custom header component
    // Layout configuration
    scrollEnabled?: boolean; // Whether scrolling is enabled
    nestedScrollEnabled?: boolean; // Whether nested scrolling is enabled
    maxHeight?: number; // Maximum height of the wall
    // Styling
    containerStyle?: any;
    contentContainerStyle?: any;
    // Callbacks
    onTweetPress?: (tweet: Tweet) => void;
    onRefresh?: () => void;
    onLoadMore?: () => void;
}

export function TweetWall({
    tweetSource,
    maxTweets,
    showHeader = false,
    headerTitle = "Tweets",
    headerComponent,
    scrollEnabled = true,
    nestedScrollEnabled = false,
    maxHeight,
    containerStyle,
    contentContainerStyle,
    onTweetPress,
    onRefresh,
    onLoadMore
}: TweetWallProps) {
    const [tweets, setTweets] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Load tweets on mount
    useEffect(() => {
        loadTweets();
    }, []);

    const loadTweets = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedTweets = await tweetSource.fetchTweets();
            const limitedTweets = maxTweets ? fetchedTweets.slice(0, maxTweets) : fetchedTweets;
            setTweets(limitedTweets);
            setHasMore(fetchedTweets.length > (maxTweets || fetchedTweets.length));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tweets');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!tweetSource.refreshTweets) return;

        try {
            setRefreshing(true);
            setError(null);
            const refreshedTweets = await tweetSource.refreshTweets();
            const limitedTweets = maxTweets ? refreshedTweets.slice(0, maxTweets) : refreshedTweets;
            setTweets(limitedTweets);
            setHasMore(refreshedTweets.length > (maxTweets || refreshedTweets.length));
            onRefresh?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh tweets');
        } finally {
            setRefreshing(false);
        }
    };

    const handleLoadMore = async () => {
        if (!tweetSource.loadMoreTweets || loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            const moreTweets = await tweetSource.loadMoreTweets();
            const currentTweets = [...tweets];
            const newTweets = maxTweets
                ? moreTweets.slice(0, maxTweets - currentTweets.length)
                : moreTweets;

            setTweets([...currentTweets, ...newTweets]);
            setHasMore(moreTweets.length > 0);
            onLoadMore?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more tweets');
        } finally {
            setLoadingMore(false);
        }
    };

    const renderTweet = ({ item }: { item: Tweet }) => (
        <TouchableOpacity
            onPress={() => onTweetPress?.(item)}
            style={styles.tweetContainer}
        >
            <TweetCard tweet={item} />
        </TouchableOpacity>
    );

    const renderHeader = () => {
        if (!showHeader) return null;

        if (headerComponent) {
            return headerComponent;
        }

        return (
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
                {tweetSource.emptyMessage || 'No tweets to show'}
            </Text>
        </View>
    );

    const renderErrorState = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
                {tweetSource.errorMessage || error || 'Failed to load tweets'}
            </Text>
            <TouchableOpacity onPress={loadTweets} style={styles.retryButton}>
                <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );

    const renderLoadMore = () => {
        if (!tweetSource.showLoadMore || !hasMore || loadingMore) return null;

        return (
            <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
                <Text style={styles.loadMoreText}>
                    {loadingMore ? 'Loading...' : 'Load More'}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (loadingMore) {
            return (
                <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#1d9bf0" />
                    <Text style={styles.loadingMoreText}>Loading more tweets...</Text>
                </View>
            );
        }

        return renderLoadMore();
    };

    // Loading state
    if (loading && tweetSource.showLoading !== false) {
        return (
            <View style={[styles.container, containerStyle]}>
                {renderHeader()}
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1d9bf0" />
                    <Text style={styles.loadingText}>Loading tweets...</Text>
                </View>
            </View>
        );
    }

    // Error state
    if (error && tweetSource.showError !== false) {
        return (
            <View style={[styles.container, containerStyle]}>
                {renderHeader()}
                {renderErrorState()}
            </View>
        );
    }

    // Empty state
    if (tweets.length === 0 && tweetSource.showEmpty !== false) {
        return (
            <View style={[styles.container, containerStyle]}>
                {renderHeader()}
                {renderEmptyState()}
            </View>
        );
    }

    // Main content
    return (
        <View style={[styles.container, containerStyle]}>
            {renderHeader()}
            <FlatList
                data={tweets}
                renderItem={renderTweet}
                keyExtractor={(item) => item._id.$oid}
                scrollEnabled={scrollEnabled}
                nestedScrollEnabled={nestedScrollEnabled}
                refreshControl={
                    tweetSource.showRefreshControl !== false ? (
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#1d9bf0"
                            colors={['#1d9bf0']}
                        />
                    ) : undefined
                }
                contentContainerStyle={[
                    styles.contentContainer,
                    contentContainerStyle,
                    maxHeight && { maxHeight }
                ]}
                style={maxHeight ? { maxHeight } : undefined}
                ListFooterComponent={renderFooter}
                showsVerticalScrollIndicator={true}
            />
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
        backgroundColor: '#000',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    contentContainer: {
        paddingBottom: 20,
    },
    tweetContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        padding: 32,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
    },
    loadingMoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    loadingMoreText: {
        color: '#71767b',
        fontSize: 14,
        marginLeft: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#71767b',
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorText: {
        color: '#f4212e',
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    loadMoreButton: {
        backgroundColor: '#16181c',
        paddingVertical: 12,
        paddingHorizontal: 24,
        margin: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2f3336',
        alignItems: 'center',
    },
    loadMoreText: {
        color: '#1d9bf0',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
