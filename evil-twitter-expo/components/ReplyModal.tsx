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
    ScrollView,
} from 'react-native';
import { Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

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
    const [originalTweet, setOriginalTweet] = useState<Tweet | null>(null);
    const [originalLoading, setOriginalLoading] = useState(false);
    const [localContent, setLocalContent] = useState(replyContent);

    // Helper to get author info safely
    const getAuthorInfo = (tweet: Tweet | null) => {
        if (!tweet) return { displayName: '', username: '', avatar: null };

        const displayName =
            tweet.author_display_name ||
            tweet.author_snapshot?.display_name ||
            tweet.author?.display_name ||
            '';

        const username =
            tweet.author_username ||
            tweet.author_snapshot?.username ||
            tweet.author?.username ||
            '';

        const avatar =
            tweet.author_avatar_url ||
            tweet.author_snapshot?.avatar_url ||
            tweet.author?.avatar_url ||
            null;

        return { displayName, username, avatar };
    };

    // Helper to parse date safely
    const parseDate = (dateValue: string | { $date?: { $numberLong?: string } } | undefined): Date => {
        if (!dateValue) return new Date();

        if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
        }

        if (typeof dateValue === 'object' && dateValue.$date?.$numberLong) {
            const timestamp = parseInt(dateValue.$date.$numberLong, 10);
            return new Date(timestamp);
        }

        return new Date();
    };

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

        // Always use targetTweet if available (it's already in memory)
        if (targetTweet) {
            setOriginalTweet(targetTweet);
            setOriginalLoading(false);
            return;
        }

        // Only fetch if we don't have the tweet in memory
        const hydrateOriginal = async () => {
            setOriginalLoading(true);
            try {
                const fetched = await fetchTweet(replyTweetId);
                if (!isMounted) return;
                setOriginalTweet(fetched);
            } catch (error) {
                console.error('Failed to fetch tweet for reply modal:', error);
                if (!isMounted) return;
                setOriginalTweet(null);
            } finally {
                if (isMounted) {
                    setOriginalLoading(false);
                }
            }
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
    const authorInfo = getAuthorInfo(previewTweet);

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
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <AppText variant="h4">Reply</AppText>
                        <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
                            <AppText variant="h3" color="tertiary">✕</AppText>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollContent}
                        contentContainerStyle={styles.scrollContentContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        {originalLoading && (
                            <View style={styles.loadingTweet}>
                                <ActivityIndicator size="small" color={colors.accent} />
                                <AppText variant="caption" color="tertiary">Fetching original tweet...</AppText>
                            </View>
                        )}

                        {!originalLoading && !previewTweet && (
                            <View style={styles.missingTweetContainer}>
                                <AppText variant="caption" color="tertiary" style={{ fontStyle: 'italic' }}>Original tweet unavailable</AppText>
                            </View>
                        )}

                        {previewTweet && (
                            <View style={styles.threadContainer}>
                                <View style={styles.timelineColumn}>
                                    <View style={styles.avatarLarge}>
                                        <AppText variant="captionBold">
                                            {authorInfo.displayName?.charAt(0).toUpperCase() ||
                                                authorInfo.username?.charAt(0).toUpperCase() ||
                                                '😈'}
                                        </AppText>
                                    </View>
                                    <View style={styles.timelineLine} />
                                    <View style={styles.avatarSmall}>
                                        <AppText variant="captionBold">
                                            {currentUser?.display_name?.charAt(0).toUpperCase() ||
                                                currentUser?.username?.charAt(0).toUpperCase() ||
                                                'You'.charAt(0)}
                                        </AppText>
                                    </View>
                                </View>
                                <View style={styles.threadContent}>
                                    <View style={styles.originalBubble}>
                                        <View style={styles.previewHeaderRow}>
                                            <AppText variant="bodyBold">
                                                {authorInfo.displayName || 'User'}
                                            </AppText>
                                            <AppText variant="caption" color="tertiary">
                                                @{authorInfo.username || 'user'}
                                            </AppText>
                                            <AppText variant="caption" color="tertiary">·</AppText>
                                            <AppText variant="caption" color="tertiary">
                                                {parseDate(previewTweet.created_at).toLocaleDateString()}
                                            </AppText>
                                        </View>
                                        <AppText variant="body">{previewTweet.content || ''}</AppText>
                                    </View>
                                    <AppText variant="caption" color="tertiary" style={{ marginBottom: spacing.sm }}>
                                        Replying to{' '}
                                        <AppText variant="captionBold" color="accent">
                                            @{authorInfo.username || 'user'}
                                        </AppText>
                                    </AppText>
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
                    </ScrollView>

                    <View style={styles.footer}>
                        <AppText variant="caption" color="tertiary">{localContent.length}/280</AppText>
                        <AppButton
                            variant="primary"
                            onPress={handleSubmit}
                            disabled={!localContent.trim() || isSubmitting}
                            loading={isSubmitting}
                        >
                            {isSubmitting ? 'Replying...' : 'Reply'}
                        </AppButton>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 540,
        maxHeight: '90%',
        backgroundColor: colors.bg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xl,
        gap: spacing.lg,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    closeText: {
        ...typography.h3,
        color: colors.textTertiary,
    },
    loadingTweet: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        gap: spacing.sm,
    },
    loadingTweetText: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    missingTweetContainer: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    missingTweetText: {
        ...typography.caption,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    threadContainer: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    timelineColumn: {
        alignItems: 'center',
        width: 40,
    },
    avatarLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        ...typography.captionBold,
        color: colors.textPrimary,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    threadContent: {
        flex: 1,
    },
    originalBubble: {
        backgroundColor: colors.bgSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    previewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    previewName: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    previewUsername: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    previewDot: {
        color: colors.textTertiary,
    },
    previewTime: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    previewBody: {
        ...typography.body,
        color: colors.textPrimary,
    },
    replyingToLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        marginBottom: spacing.sm,
    },
    replyingToUsername: {
        ...typography.captionBold,
        color: colors.accent,
    },
    input: {
        minHeight: 90,
        maxHeight: 220,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        padding: spacing.md,
        color: colors.textPrimary,
        ...typography.body,
        marginBottom: spacing.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    counter: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    submitButton: {
        backgroundColor: colors.accent,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.xl,
        borderRadius: radii.pill,
    },
    submitButtonDisabled: {
        backgroundColor: colors.accentActive,
    },
    submitButtonText: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
});
