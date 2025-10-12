import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from 'react-native';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';

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
    } = useTweetsStore();

    const { user: currentUser } = useBackendUserStore();

    // Find the original tweet being quoted
    const originalTweet = tweets.find(tweet => tweet._id.$oid === quoteTweetId);

    const handleQuoteSubmit = async () => {
        if (!quoteContent.trim()) {
            Alert.alert('Error', 'Please enter some content for your quote');
            return;
        }

        if (!currentUser?._id?.$oid || !quoteTweetId) {
            Alert.alert('Error', 'Unable to quote tweet');
            return;
        }

        const result = await quoteTweet(quoteContent.trim(), quoteTweetId, currentUser._id.$oid);

        if (result.success) {
            Alert.alert('Success', 'Tweet quoted successfully!');
            clearQuoteData();
        } else {
            Alert.alert('Error', result.error || 'Failed to quote tweet');
        }
    };

    const handleCancel = () => {
        clearQuoteData();
    };

    return (
        <Modal
            visible={showQuoteModal}
            animationType="fade"
            transparent={true}
            onRequestClose={closeQuoteModal}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Quote Tweet</Text>
                        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent}>
                        {/* Original Tweet Preview */}
                        {originalTweet && (
                            <View style={styles.originalTweetContainer}>
                                <Text style={styles.originalTweetLabel}>Quoting:</Text>
                                <View style={styles.originalTweet}>
                                    <View style={styles.originalTweetHeader}>
                                        <View style={styles.originalTweetAvatar}>
                                            <Text style={styles.originalTweetAvatarText}>
                                                {originalTweet.author?.display_name?.charAt(0).toUpperCase() || '😈'}
                                            </Text>
                                        </View>
                                        <View style={styles.originalTweetInfo}>
                                            <Text style={styles.originalTweetName}>
                                                {originalTweet.author?.display_name || 'User'}
                                            </Text>
                                            <Text style={styles.originalTweetUsername}>
                                                @{originalTweet.author?.username || 'user'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.originalTweetContent}>
                                        {originalTweet.content}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.content}>
                            <Text style={styles.label}>Add your comment:</Text>
                            <TextInput
                                style={styles.textInput}
                                value={quoteContent}
                                onChangeText={setQuoteContent}
                                placeholder="What are your thoughts?"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={280}
                            />
                            <Text style={styles.characterCount}>
                                {quoteContent.length}/280
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quoteButton}
                            onPress={handleQuoteSubmit}
                        >
                            <Text style={styles.quoteButtonText}>Quote Tweet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    scrollContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    closeText: {
        color: '#888',
        fontSize: 18,
    },
    content: {
        padding: 16,
    },
    label: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#2a2a2a',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 16,
        minHeight: 100,
    },
    characterCount: {
        color: '#888',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    cancelButtonText: {
        color: '#888',
        fontSize: 16,
    },
    quoteButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    quoteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    originalTweetContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    originalTweetLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
    },
    originalTweet: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#444',
    },
    originalTweetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    originalTweetAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#536471',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    originalTweetAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    originalTweetInfo: {
        flex: 1,
    },
    originalTweetName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    originalTweetUsername: {
        color: '#888',
        fontSize: 12,
    },
    originalTweetContent: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 18,
    },
});
