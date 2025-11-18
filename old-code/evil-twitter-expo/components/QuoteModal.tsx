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
                            <TouchableOpacity
                                onPress={handleCancel}
                                style={styles.cancelButton}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <Text style={styles.title}>Quote Tweet</Text>

                            <TouchableOpacity
                                onPress={handleQuoteSubmit}
                                style={[
                                    styles.quoteButton,
                                    (!trimmedContent || isSubmitting) && styles.quoteButtonDisabled,
                                ]}
                                disabled={!trimmedContent || isSubmitting}
                            >
                                <Text
                                    style={[
                                        styles.quoteButtonText,
                                        (!trimmedContent || isSubmitting) && styles.quoteButtonTextDisabled,
                                    ]}
                                >
                                    {isSubmitting ? 'Posting...' : 'Quote'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    <View style={styles.body}>
                        <View style={styles.composerRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {currentUser?.display_name?.charAt(0).toUpperCase() ||
                                        currentUser?.username?.charAt(0).toUpperCase() ||
                                        '😈'}
                                </Text>
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
                            <Text style={styles.characterCount}>{localContent.length}/280</Text>
                        </View>

                        {previewTweet && (
                            <View style={styles.previewWrapper}>
                                <Text style={styles.previewLabel}>Original Tweet</Text>
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 16,
    },
    sheet: {
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
        backgroundColor: '#000',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2f3336',
        overflow: 'hidden',
    },
    body: {
        padding: 20,
        gap: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1f1f1f',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    cancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    cancelButtonText: {
        color: '#1DA1F2',
        fontSize: 16,
    },
    quoteButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    quoteButtonDisabled: {
        backgroundColor: '#333',
    },
    quoteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    quoteButtonTextDisabled: {
        color: '#666',
    },
    composerRow: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1d9bf0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
    },
    textInput: {
        flex: 1,
        minHeight: 100,
        color: '#fff',
        fontSize: 16,
        textAlignVertical: 'top',
        paddingVertical: 8,
    },
    composerFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    characterCount: {
        color: '#6b6e72',
        fontSize: 13,
    },
    previewWrapper: {
        gap: 8,
    },
    previewLabel: {
        color: '#6b6e72',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    previewCard: {
        borderWidth: 1,
        borderColor: '#2f3336',
        borderRadius: 16,
        overflow: 'hidden',
    },
});
