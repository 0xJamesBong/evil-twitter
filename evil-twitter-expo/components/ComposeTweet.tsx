import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useComposeStore } from '@/lib/stores/composeStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
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
        if (!content.trim() || !currentUser?._id?.$oid) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createTweet(content, currentUser._id.$oid);
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
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.content}>
                {/* Avatar */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {currentUser?.display_name?.charAt(0).toUpperCase() || '😈'}
                    </Text>
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
                        <Text style={styles.errorText}>{error}</Text>
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

                        <TouchableOpacity
                            style={[
                                styles.postButton,
                                (!content.trim() || isOverLimit || isSubmitting) && styles.postButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!content.trim() || isOverLimit || isSubmitting}
                        >
                            <Text style={styles.postButtonText}>
                                {isSubmitting ? 'Posting...' : `Post ${content.length > 0 ? `(${content.length}/280)` : ''}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#2f3336',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 8,
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
        color: '#71767b',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    inputContainer: {
        flex: 1,
    },
    input: {
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: 20,
        lineHeight: 24,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    inputError: {
        color: '#f4212e',
    },
    errorText: {
        color: '#f4212e',
        marginTop: 8,
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#2f3336',
    },
    mediaButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    mediaButton: {
        padding: 8,
        borderRadius: 20,
    },
    mediaIcon: {
        fontSize: 20,
        color: '#1d9bf0',
    },
    postButton: {
        backgroundColor: '#1d9bf0',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    postButtonDisabled: {
        backgroundColor: '#536471',
    },
    postButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
