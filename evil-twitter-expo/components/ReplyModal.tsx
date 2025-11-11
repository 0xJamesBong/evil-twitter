import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';

export function ReplyModal() {
    const {
        showReplyModal,
        replyTweetId,
        replyContent,
        setReplyContent,
        clearReplyData,
        replyTweet,
        tweets,
        threads,
        fetchTweet,
    } = useTweetsStore();
    const { user: currentUser } = useBackendUserStore();
    const targetTweet = useMemo(() => {
        if (!replyTweetId) return null;

        const fromTimeline = tweets.find(tweet => tweet._id.$oid === replyTweetId);
        if (fromTimeline) return fromTimeline;

        for (const threadData of Object.values(threads)) {
            if (!threadData) continue;
            if (threadData.tweet._id.$oid === replyTweetId) {
                return threadData.tweet;
            }

            const parentMatch = threadData.parents.find(
                (tweet) => tweet._id.$oid === replyTweetId
            );
            if (parentMatch) {
                return parentMatch;
            }

            const replyMatch = threadData.replies.find(
                (tweet) => tweet._id.$oid === replyTweetId
            );
            if (replyMatch) {
                return replyMatch;
            }
        }

        return null;
    }, [replyTweetId, threads, tweets]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [originalTweet, setOriginalTweet] = useState<Tweet | null>(targetTweet ?? null);
    const [originalLoading, setOriginalLoading] = useState(false);
    const [localContent, setLocalContent] = useState(replyContent);

    useEffect(() => {
        setLocalContent(showReplyModal ? replyContent : '');
    }, [showReplyModal, replyContent]);

    useEffect(() => {
        let isMounted = true;

        if (!replyTweetId || !showReplyModal) {
            setOriginalTweet(null);
            setOriginalLoading(false);
            return;
        }

        if (targetTweet) {
            setOriginalTweet(targetTweet);
            setOriginalLoading(false);
            return;
        }

        const hydrateOriginal = async () => {
            setOriginalLoading(true);
            const fetched = await fetchTweet(replyTweetId);
            if (!isMounted) return;
            setOriginalTweet(fetched);
            setOriginalLoading(false);
        };

        hydrateOriginal();

        return () => {
            isMounted = false;
        };
    }, [replyTweetId, targetTweet, fetchTweet, showReplyModal]);

    const handleClose = () => {
        if (isSubmitting) return;
        clearReplyData();
    };

    const handleSubmit = async () => {
        if (!replyTweetId || !localContent.trim() || !currentUser?._id?.$oid) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await replyTweet(localContent.trim(), replyTweetId);
            if (result.success) {
                clearReplyData();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContentChange = (text: string) => {
        setLocalContent(text);
        setReplyContent(text);
    };

    if (!showReplyModal || !replyTweetId) {
        return null;
    }

    const previewTweet = originalTweet || targetTweet;

    return (
        <Modal
            visible={showReplyModal}
            animationType="fade"
            transparent
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Reply</Text>
                        <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {originalLoading && (
                        <View style={styles.loadingTweet}>
                            <ActivityIndicator size="small" color="#1DA1F2" />
                            <Text style={styles.loadingTweetText}>Fetching original tweet...</Text>
                        </View>
                    )}

                    {!originalLoading && !previewTweet && (
                        <View style={styles.missingTweetContainer}>
                            <Text style={styles.missingTweetText}>Original tweet unavailable</Text>
                        </View>
                    )}

                    {previewTweet && (
                        <View style={styles.threadContainer}>
                            <View style={styles.timelineColumn}>
                                <View style={styles.avatarLarge}>
                                    <Text style={styles.avatarText}>
                                        {previewTweet.author_display_name?.charAt(0).toUpperCase() ||
                                            previewTweet.author_username?.charAt(0).toUpperCase() ||
                                            '😈'}
                                    </Text>
                                </View>
                                <View style={styles.timelineLine} />
                                <View style={styles.avatarSmall}>
                                    <Text style={styles.avatarText}>
                                        {currentUser?.display_name?.charAt(0).toUpperCase() ||
                                            currentUser?.username?.charAt(0).toUpperCase() ||
                                            'You'.charAt(0)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.threadContent}>
                                <View style={styles.originalBubble}>
                                    <View style={styles.previewHeaderRow}>
                                        <Text style={styles.previewName}>
                                            {previewTweet.author_display_name || previewTweet.author_username || 'User'}
                                        </Text>
                                        <Text style={styles.previewUsername}>
                                            @{previewTweet.author_username || 'user'}
                                        </Text>
                                        <Text style={styles.previewDot}>·</Text>
                                        <Text style={styles.previewTime}>
                                            {new Date(previewTweet.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text style={styles.previewBody}>{previewTweet.content}</Text>
                                </View>
                                <Text style={styles.replyingToLabel}>
                                    Replying to{' '}
                                    <Text style={styles.replyingToUsername}>
                                        @{previewTweet.author_username || 'user'}
                                    </Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tweet your reply..."
                                    placeholderTextColor="#6b6e72"
                                    multiline
                                    value={localContent}
                                    onChangeText={handleContentChange}
                                    maxLength={280}
                                    editable={!isSubmitting}
                                    autoFocus
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    )}

                    {(!originalLoading && !previewTweet) && (
                        <TextInput
                            style={styles.input}
                            placeholder="Tweet your reply..."
                            placeholderTextColor="#6b6e72"
                            multiline
                            value={localContent}
                            onChangeText={handleContentChange}
                            maxLength={280}
                            editable={!isSubmitting}
                            autoFocus
                            textAlignVertical="top"
                        />
                    )}

                    <View style={styles.footer}>
                        <Text style={styles.counter}>{localContent.length}/280</Text>
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!localContent.trim() || isSubmitting) && styles.submitButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={!localContent.trim() || isSubmitting}
                        >
                            <Text style={styles.submitButtonText}>
                                {isSubmitting ? 'Replying...' : 'Reply'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    card: {
        width: '100%',
        maxWidth: 540,
        backgroundColor: '#000',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2f3336',
        padding: 20,
        gap: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    closeText: {
        color: '#6b6e72',
        fontSize: 20,
    },
    loadingTweet: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 8,
    },
    loadingTweetText: {
        color: '#6b6e72',
        fontSize: 14,
    },
    missingTweetContainer: {
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    missingTweetText: {
        color: '#6b6e72',
        fontSize: 14,
        fontStyle: 'italic',
    },
    threadContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineColumn: {
        alignItems: 'center',
        width: 40,
    },
    avatarLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1d9bf0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#2f3336',
        marginVertical: 6,
    },
    threadContent: {
        flex: 1,
    },
    originalBubble: {
        backgroundColor: '#0f0f0f',
        borderWidth: 1,
        borderColor: '#2f3336',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
    },
    previewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    previewName: {
        color: '#fff',
        fontWeight: '600',
    },
    previewUsername: {
        color: '#6b6e72',
        fontSize: 13,
    },
    previewDot: {
        color: '#6b6e72',
    },
    previewTime: {
        color: '#6b6e72',
        fontSize: 13,
    },
    previewBody: {
        color: '#e7e9ea',
        fontSize: 15,
        lineHeight: 20,
    },
    replyingToLabel: {
        color: '#6b6e72',
        fontSize: 14,
        marginBottom: 8,
    },
    replyingToUsername: {
        color: '#1DA1F2',
        fontWeight: '600',
    },
    input: {
        minHeight: 90,
        maxHeight: 220,
        borderWidth: 1,
        borderColor: '#2f3336',
        borderRadius: 16,
        padding: 12,
        color: '#fff',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    counter: {
        color: '#6b6e72',
        fontSize: 13,
    },
    submitButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 999,
    },
    submitButtonDisabled: {
        backgroundColor: '#1d4466',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
