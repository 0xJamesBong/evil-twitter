import React, { useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
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
    } = useTweetsStore();
    const { user: currentUser } = useBackendUserStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleClose = () => {
        if (isSubmitting) return;
        clearReplyData();
    };

    const handleSubmit = async () => {
        if (!replyTweetId || !replyContent.trim() || !currentUser?._id?.$oid) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await replyTweet(replyContent.trim(), replyTweetId);
            if (result.success) {
                clearReplyData();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!showReplyModal || !replyTweetId) {
        return null;
    }

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

                    {targetTweet && (
                        <View style={styles.preview}>
                            <View style={styles.previewAvatar}>
                                <Text style={styles.previewAvatarText}>
                                    {targetTweet.author_display_name?.charAt(0).toUpperCase() ||
                                        targetTweet.author_username?.charAt(0).toUpperCase() ||
                                        '😈'}
                                </Text>
                            </View>
                            <View style={styles.previewContent}>
                                <View style={styles.previewHeader}>
                                    <Text style={styles.previewName}>
                                        {targetTweet.author_display_name ||
                                            targetTweet.author_username ||
                                            'User'}
                                    </Text>
                                    <Text style={styles.previewUsername}>
                                        @{targetTweet.author_username || 'user'}
                                    </Text>
                                </View>
                                <Text style={styles.previewText}>{targetTweet.content}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Tweet your reply..."
                            placeholderTextColor="#6b6e72"
                            multiline
                            value={replyContent}
                            onChangeText={setReplyContent}
                            maxLength={280}
                            editable={!isSubmitting}
                        />
                        <View style={styles.footer}>
                            <Text style={styles.counter}>{replyContent.length}/280</Text>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!replyContent.trim() || isSubmitting) && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={!replyContent.trim() || isSubmitting}
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
    inputContainer: {
        borderTopWidth: 1,
        borderTopColor: '#2f3336',
        paddingTop: 16,
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
