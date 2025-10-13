import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTweetsStore, Tweet } from '@/lib/stores/tweetsStore';
import { TweetComponent } from '@/components/TweetComponent';

export default function TweetPage() {
    const { tweetId } = useLocalSearchParams<{ tweetId: string }>();
    const { fetchTweet, fetchThread, threads, threadLoading, threadError } = useTweetsStore();

    const [tweet, setTweet] = useState<Tweet | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTweet = async () => {
        if (!tweetId) return;

        setLoading(true);
        try {
            const tweetData = await fetchTweet(tweetId);
            if (tweetData) {
                setTweet(tweetData);
                // Also fetch the thread if this tweet has replies
                if (tweetData.replies_count > 0) {
                    await fetchThread(tweetId);
                }
            }
        } catch (error) {
            console.error('Failed to load tweet:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTweet();
        setRefreshing(false);
    };

    useEffect(() => {
        loadTweet();
    }, [tweetId]);


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1DA1F2" />
                <Text style={styles.loadingText}>Loading tweet...</Text>
            </View>
        );
    }

    if (!tweet) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Tweet not found</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadTweet}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const threadTweets = threads[tweetId] || [];
    const replies = threadTweets.filter(t => t.tweet_type === 'reply' && t.replied_to_tweet_id?.$oid === tweetId);

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Main Tweet */}
            <TweetComponent
                tweet={tweet}
                isClickable={false}
            />

            {/* Replies */}
            {replies.length > 0 && (
                <View style={styles.repliesSection}>
                    <Text style={styles.repliesHeader}>
                        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                    </Text>
                    {replies.map(reply => (
                        <TweetComponent
                            key={reply._id.$oid}
                            tweet={reply}
                            isReply={true}
                            isClickable={true}
                        />
                    ))}
                </View>
            )}

            {/* Loading indicator for thread */}
            {threadLoading && (
                <View style={styles.threadLoading}>
                    <ActivityIndicator size="small" color="#1DA1F2" />
                    <Text style={styles.threadLoadingText}>Loading replies...</Text>
                </View>
            )}

            {/* Error state for thread */}
            {threadError && (
                <View style={styles.threadError}>
                    <Text style={styles.threadErrorText}>{threadError}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    errorText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    repliesSection: {
        marginTop: 8,
    },
    repliesHeader: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#16181c',
    },
    threadLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    threadLoadingText: {
        color: '#71767b',
        marginLeft: 8,
    },
    threadError: {
        padding: 16,
        alignItems: 'center',
    },
    threadErrorText: {
        color: '#F44336',
        textAlign: 'center',
    },
});
