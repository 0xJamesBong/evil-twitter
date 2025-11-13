import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useComposeStore } from '@/lib/stores/composeStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ComposeTweetProps {
    onClose?: () => void;
}

export function ComposeTweet({ onClose }: ComposeTweetProps) {
    const { user: currentUser } = useBackendUserStore();
    const { createTweet } = useTweetsStore();
    const { content, isSubmitting, error, setContent, setIsSubmitting, setError, clearCompose } = useComposeStore();

    const handleSubmit = async () => {
        if (!content.trim()) return;
        if (!currentUser?._id?.$oid) {
            setError('You must be logged in to post');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createTweet(content.trim());
            if (result.success) {
                clearCompose();
                onClose?.(); // Close modal after successful post
            } else {
                setError(result.error || 'Failed to post tweet');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isOverLimit = content.length > 280;

    return (
        <View style={styles.container}>
            {/* Header with close button */}
            {onClose && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <AppText variant="h4" color="secondary">✕</AppText>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.content}>
                {/* Avatar */}
                <View style={styles.avatar}>
                    <AppText variant="h4">
                        {currentUser?.display_name?.charAt(0).toUpperCase() || '😈'}
                    </AppText>
                </View>

                {/* Tweet Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        value={content}
                        onChangeText={setContent}
                        placeholder="What's happening?"
                        placeholderTextColor="#666"
                        multiline
                        style={[styles.input, isOverLimit && styles.inputError]}
                        maxLength={280}
                    />

                    {error && (
                        <AppText variant="caption" color="danger">{error}</AppText>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <View style={styles.mediaButtons}>
                            <TouchableOpacity style={styles.mediaButton}>
                                <Text style={styles.mediaIcon}>🖼️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mediaButton}>
                                <Text style={styles.mediaIcon}>🎬</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mediaButton}>
                                <Text style={styles.mediaIcon}>📊</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mediaButton}>
                                <Text style={styles.mediaIcon}>😊</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mediaButton}>
                                <Text style={styles.mediaIcon}>📅</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mediaButton}>
                                <Text style={styles.mediaIcon}>📍</Text>
                            </TouchableOpacity>
                        </View>

                        <AppButton
                            variant="primary"
                            onPress={handleSubmit}
                            disabled={!content.trim() || isOverLimit || isSubmitting}
                            loading={isSubmitting}
                        >
                            {isSubmitting ? 'Posting...' : `Post ${content.length > 0 ? `(${content.length}/280)` : ''}`}
                        </AppButton>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        ...typography.h4,
        color: colors.textSecondary,
    },
    content: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.borderStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    inputContainer: {
        flex: 1,
    },
    input: {
        backgroundColor: 'transparent',
        color: colors.textPrimary,
        ...typography.h3,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    inputError: {
        color: colors.dangerStrong,
    },
    errorText: {
        ...typography.caption,
        color: colors.dangerStrong,
        marginTop: spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    mediaButtons: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    mediaButton: {
        padding: spacing.sm,
        borderRadius: radii.pill,
    },
    mediaIcon: {
        fontSize: 20,
        color: colors.accent,
    },
    postButton: {
        backgroundColor: colors.accent,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
        minWidth: 80,
        alignItems: 'center',
    },
    postButtonDisabled: {
        backgroundColor: colors.borderStrong,
    },
    postButtonText: {
        ...typography.bodyBold,
        color: colors.textPrimary,
    },
});
