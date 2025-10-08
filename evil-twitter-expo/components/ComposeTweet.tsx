import React from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useComposeStore } from '@/lib/stores/composeStore';

export function ComposeTweet() {
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
        borderBottomColor: '#333',
    },
    content: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1DA1F2',
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
        lineHeight: 28,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    inputError: {
        color: '#ff4444',
    },
    errorText: {
        color: '#ff4444',
        marginTop: 8,
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    mediaButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    mediaButton: {
        padding: 8,
    },
    mediaIcon: {
        fontSize: 20,
    },
    postButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    postButtonDisabled: {
        backgroundColor: '#666',
    },
    postButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
