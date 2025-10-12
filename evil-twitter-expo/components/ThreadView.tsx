import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import { TweetCard } from './TweetCard';

interface ThreadViewProps {
    rootTweetId: string;
    onClose?: () => void;
}

export function ThreadView({ rootTweetId, onClose }: ThreadViewProps) {
    const { threads, threadLoading, threadError, fetchThread } = useTweetsStore();
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

    const threadTweets = threads[rootTweetId] || [];
    const rootTweet = threadTweets.find(tweet => tweet._id.$oid === rootTweetId);
    const replies = threadTweets.filter(tweet => tweet._id.$oid !== rootTweetId);

    useEffect(() => {
        if (!threadTweets.length) {
            fetchThread(rootTweetId);
        }
    }, [rootTweetId, fetchThread, threadTweets.length]);

    const toggleReplyExpansion = (tweetId: string) => {
        setExpandedReplies(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tweetId)) {
                newSet.delete(tweetId);
            } else {
                newSet.add(tweetId);
            }
            return newSet;
        });
    };

    const renderReply = (tweet: Tweet, depth: number = 0) => {
        const isExpanded = expandedReplies.has(tweet._id.$oid);
        const childReplies = replies.filter(
            reply => reply.replied_to_tweet_id === tweet._id.$oid
        );

        return (
            <View key={tweet._id.$oid} style={[styles.replyContainer, { marginLeft: depth * 20 }]}>
                <TweetCard tweet={tweet} />

                {childReplies.length > 0 && (
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => toggleReplyExpansion(tweet._id.$oid)}
                    >
                        <Text style={styles.expandButtonText}>
                            {isExpanded ? 'Hide replies' : `Show ${childReplies.length} replies`}
                        </Text>
                    </TouchableOpacity>
                )}

                {isExpanded && childReplies.length > 0 && (
                    <View style={styles.childReplies}>
                        {childReplies.map(reply => renderReply(reply, depth + 1))}
                    </View>
                )}
            </View>
        );
    };

    const renderTopLevelReplies = () => {
        const topLevelReplies = replies.filter(
            reply => reply.reply_depth === 1 || !reply.reply_depth
        );

        return topLevelReplies.map(reply => renderReply(reply));
    };

    if (threadLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1DA1F2" />
                <Text style={styles.loadingText}>Loading thread...</Text>
            </View>
        );
    }

    if (threadError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {threadError}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => fetchThread(rootTweetId)}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!rootTweet) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Thread not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Thread</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={[rootTweet]}
                renderItem={({ item }) => <TweetCard tweet={item} />}
                keyExtractor={(item) => item._id.$oid}
                style={styles.rootTweet}
            />

            <View style={styles.repliesSection}>
                <Text style={styles.repliesTitle}>
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </Text>
                {renderTopLevelReplies()}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 18,
        color: '#1DA1F2',
    },
    rootTweet: {
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    repliesSection: {
        flex: 1,
        padding: 16,
    },
    repliesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    replyContainer: {
        marginBottom: 8,
    },
    expandButton: {
        padding: 8,
        marginLeft: 16,
        marginTop: 4,
    },
    expandButtonText: {
        color: '#1DA1F2',
        fontSize: 14,
    },
    childReplies: {
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 16,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#1DA1F2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
