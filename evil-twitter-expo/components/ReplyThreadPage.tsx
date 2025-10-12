import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { Tweet } from '@/lib/stores/tweetsStore';
import { TweetCard } from './TweetCard';

interface ReplyThreadPageProps {
    rootTweetId: string;
    onClose?: () => void;
}

export function ReplyThreadPage({ rootTweetId, onClose }: ReplyThreadPageProps) {
    const {
        threads,
        threadLoading,
        threadError,
        fetchThread,
        replyTweet,
        tweets
    } = useTweetsStore();
    const { user: currentUser } = useBackendUserStore();

    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const threadTweets = threads[rootTweetId] || [];
    const rootTweet = threadTweets.find(tweet => tweet._id.$oid === rootTweetId);
    const replies = threadTweets.filter(tweet => tweet._id.$oid !== rootTweetId);

    useEffect(() => {
        if (rootTweetId && !threadTweets.length) {
            fetchThread(rootTweetId);
        }
    }, [rootTweetId, fetchThread, threadTweets.length]);

    const handleReplySubmit = async () => {
        if (!replyContent.trim()) {
            Alert.alert('Error', 'Please enter some content for your reply');
            return;
        }

        if (!currentUser?._id?.$oid) {
            Alert.alert('Error', 'You must be logged in to reply');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await replyTweet(replyContent.trim(), rootTweetId, currentUser._id.$oid);

            if (result.success) {
                setReplyContent('');
                // Refresh the thread to show the new reply
                fetchThread(rootTweetId);
                Alert.alert('Success', 'Reply posted successfully!');
            } else {
                Alert.alert('Error', result.error || 'Failed to post reply');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to post reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderReply = ({ item: tweet, index }: { item: Tweet; index: number }) => {
        const depth = tweet.reply_depth || 0;
        const isLastInBranch = index === replies.length - 1 ||
            (replies[index + 1] && (replies[index + 1].reply_depth || 0) <= depth);

        return (
            <View style={[styles.replyContainer, { marginLeft: depth * 20 }]}>
                <View style={styles.replyLine}>
                    {depth > 0 && (
                        <View style={[
                            styles.replyLineVertical,
                            isLastInBranch && styles.replyLineVerticalLast
                        ]} />
                    )}
                    <View style={styles.replyContent}>
                        <TweetCard tweet={tweet} />
                    </View>
                </View>
            </View>
        );
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>Thread</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Root Tweet */}
            <View style={styles.rootTweetContainer}>
                <TweetCard tweet={rootTweet} />
            </View>

            {/* Replies */}
            <View style={styles.repliesContainer}>
                <Text style={styles.repliesTitle}>
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </Text>
                <FlatList
                    data={replies}
                    renderItem={renderReply}
                    keyExtractor={(item) => item._id.$oid}
                    showsVerticalScrollIndicator={false}
                    style={styles.repliesList}
                />
            </View>

            {/* Reply Input */}
            <View style={styles.replyInputContainer}>
                <View style={styles.replyInputHeader}>
                    <Text style={styles.replyInputLabel}>Reply to this thread:</Text>
                </View>
                <View style={styles.replyInputRow}>
                    <TextInput
                        style={styles.replyTextInput}
                        value={replyContent}
                        onChangeText={setReplyContent}
                        placeholder="Tweet your reply..."
                        multiline
                        textAlignVertical="top"
                        maxLength={280}
                        editable={!isSubmitting}
                    />
                    <TouchableOpacity
                        onPress={handleReplySubmit}
                        style={[
                            styles.submitButton,
                            (!replyContent.trim() || isSubmitting) && styles.submitButtonDisabled
                        ]}
                        disabled={!replyContent.trim() || isSubmitting}
                    >
                        <Text style={[
                            styles.submitButtonText,
                            (!replyContent.trim() || isSubmitting) && styles.submitButtonTextDisabled
                        ]}>
                            {isSubmitting ? 'Posting...' : 'Reply'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.characterCount}>
                    {replyContent.length}/280
                </Text>
            </View>
        </KeyboardAvoidingView>
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
        marginTop: 16,
        fontSize: 16,
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    backButtonText: {
        color: '#1DA1F2',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 60, // Same width as back button to center the title
    },
    rootTweetContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    repliesContainer: {
        flex: 1,
        padding: 16,
    },
    repliesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    repliesList: {
        flex: 1,
    },
    replyContainer: {
        marginBottom: 8,
    },
    replyLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    replyLineVertical: {
        width: 2,
        backgroundColor: '#333',
        marginRight: 8,
        minHeight: 20,
    },
    replyLineVerticalLast: {
        height: 20,
    },
    replyContent: {
        flex: 1,
    },
    replyInputContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1a1a1a',
    },
    replyInputHeader: {
        marginBottom: 8,
    },
    replyInputLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    replyInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    replyTextInput: {
        flex: 1,
        backgroundColor: '#2a2a2a',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 16,
        minHeight: 40,
        maxHeight: 120,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#333',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    submitButtonTextDisabled: {
        color: '#666',
    },
    characterCount: {
        color: '#888',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
});
