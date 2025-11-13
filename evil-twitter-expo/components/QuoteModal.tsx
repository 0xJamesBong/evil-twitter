import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';
import { TweetComponent } from './TweetComponent';

export function QuoteModal() {
    const {
        showQuoteModal,
        quoteTweetId,
        quoteContent,
        closeQuoteModal,
        setQuoteContent,
        clearQuoteData,
        quoteTweet,
        tweets,
        threads,
    } = useTweetsStore();

    const { user: currentUser } = useBackendUserStore();
    const [localContent, setLocalContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const previewTweet = useMemo(() => {
        if (!quoteTweetId) return null;

        const fromTimeline = tweets.find(tweet => tweet._id.$oid === quoteTweetId);
        if (fromTimeline) return fromTimeline;

        for (const thread of Object.values(threads)) {
            if (!thread) continue;
            if (thread.tweet._id.$oid === quoteTweetId) return thread.tweet;
            const parentHit = thread.parents.find(t => t._id.$oid === quoteTweetId);
            if (parentHit) return parentHit;
            const replyHit = thread.replies.find(t => t._id.$oid === quoteTweetId);
            if (replyHit) return replyHit;
        }

        return null;
    }, [quoteTweetId, threads, tweets]);

    // Sync local state with store state
    useEffect(() => {
        if (showQuoteModal) {
            setLocalContent(quoteContent);
        }
    }, [showQuoteModal, quoteContent]);

    const handleContentChange = (text: string) => {
        setLocalContent(text);
        setQuoteContent(text);
    };

    const trimmedContent = localContent.trim();

    const handleQuoteSubmit = async () => {
        if (!trimmedContent || !currentUser?._id?.$oid || !quoteTweetId) {
            return;
        }

        setIsSubmitting(true);

        const result = await quoteTweet(trimmedContent, quoteTweetId);

        if (result.success) {
            clearQuoteData();
            setLocalContent('');
        } else {
            Alert.alert('Error', result.error || 'Failed to quote tweet');
        }

        setIsSubmitting(false);
    };

    const handleCancel = () => {
        clearQuoteData();
        setLocalContent('');
    };

    if (!showQuoteModal) {
        return null;
    }

    return (
        <Modal
            visible={showQuoteModal}
            animationType="fade"
            transparent
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.sheet}>
                    <SafeAreaView>
                        <View style={styles.header}>
                            <AppButton variant="ghost" size="sm" onPress={handleCancel}>
                                Cancel
                            </AppButton>

                            <AppText variant="h4">Quote Tweet</AppText>

                            <AppButton
                                variant="primary"
                                onPress={handleQuoteSubmit}
                                disabled={!trimmedContent || isSubmitting}
                                loading={isSubmitting}
                            >
                                {isSubmitting ? 'Posting...' : 'Quote'}
                            </AppButton>
                        </View>
                    </SafeAreaView>

                    <View style={styles.body}>
                        <View style={styles.composerRow}>
                            <View style={styles.avatar}>
                                <AppText variant="h4">
                                    {currentUser?.display_name?.charAt(0).toUpperCase() ||
                                        currentUser?.username?.charAt(0).toUpperCase() ||
                                        '😈'}
                                </AppText>
                            </View>
                            <TextInput
                                style={styles.textInput}
                                value={localContent}
                                onChangeText={handleContentChange}
                                placeholder="Add a comment"
                                placeholderTextColor="#6b6e72"
                                multiline
                                textAlignVertical="top"
                                maxLength={280}
                                autoFocus
                                editable={!isSubmitting}
                            />
                        </View>

                        <View style={styles.composerFooter}>
                            <AppText variant="caption" color="tertiary">{localContent.length}/280</AppText>
                        </View>

                        {previewTweet && (
                            <View style={styles.previewWrapper}>
                                <AppText variant="caption" color="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Original Tweet</AppText>
                                <View style={styles.previewCard}>
                                    <TweetComponent
                                        tweet={previewTweet}
                                        isClickable={false}
                                        showActions={false}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlayStrong,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    sheet: {
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
        backgroundColor: colors.bg,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    body: {
        padding: spacing.xl,
        gap: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.bgSubtle,
    },
    title: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    cancelButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    cancelButtonText: {
        ...typography.bodyLarge,
        color: colors.accent,
    },
    quoteButton: {
        backgroundColor: colors.accent,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
    },
    quoteButtonDisabled: {
        backgroundColor: colors.bgCardSecondary,
    },
    quoteButtonText: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
    quoteButtonTextDisabled: {
        color: colors.textTertiary,
    },
    composerRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    textInput: {
        flex: 1,
        minHeight: 100,
        color: colors.textPrimary,
        ...typography.bodyLarge,
        textAlignVertical: 'top',
        paddingVertical: spacing.sm,
    },
    composerFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    characterCount: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    previewWrapper: {
        gap: spacing.sm,
    },
    previewLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    previewCard: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        overflow: 'hidden',
    },
});
