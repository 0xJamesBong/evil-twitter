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
import { TweetComponent } from './TweetComponent';

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

        for (const threadTweets of Object.values(threads)) {
            const match = threadTweets.find(tweet => tweet._id.$oid === replyTweetId);
            if (match) return match;
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

                    {previewTweet && (
                        <View style={styles.preview}>
                            <TweetComponent
                                tweet={previewTweet}
                                isClickable={false}
                                showActions={false}
                            />
                        </View>
                    )}

                    {!originalLoading && !previewTweet && (
                        <View style={styles.missingTweetContainer}>
                            <Text style={styles.missingTweetText}>Original tweet unavailable</Text>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        {previewTweet && (
                            <Text style={styles.replyingToLabel}>
                                Replying to{' '}
                                <Text style={styles.replyingToUsername}>
                                    @{previewTweet.author_username || 'user'}
                                </Text>
                            </Text>
                        )}
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
        maxWidth: 520,
        backgroundColor: '#000',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2f3336',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
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
    preview: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    previewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    previewAvatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    previewContent: {
        flex: 1,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    previewName: {
        color: '#fff',
        fontWeight: '600',
        marginRight: 6,
    },
    previewUsername: {
        color: '#6b6e72',
    },
    previewText: {
        color: '#e7e9ea',
        fontSize: 15,
        lineHeight: 20,
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
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: '#2f3336',
        paddingTop: 16,
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
        minHeight: 80,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#2f3336',
        borderRadius: 12,
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
