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

export function ReplyModal() {
    const {
        showReplyModal,
        replyTweetId,
        replyContent,
        closeReplyModal,
        setReplyContent,
        clearReplyData,
        replyTweet,
        tweets,
    } = useTweetsStore();

    const { user: currentUser } = useBackendUserStore();

    // Find the original tweet being replied to
    const originalTweet = tweets.find(tweet => tweet._id.$oid === replyTweetId);

    const handleReplySubmit = async () => {
        if (!replyContent.trim()) {
            Alert.alert('Error', 'Please enter some content for your reply');
            return;
        }

        if (!currentUser?._id?.$oid || !replyTweetId) {
            Alert.alert('Error', 'Unable to reply to tweet');
            return;
        }

        const result = await replyTweet(replyContent.trim(), replyTweetId, currentUser._id.$oid);

        if (result.success) {
            Alert.alert('Success', 'Reply posted successfully!');
            clearReplyData();
        } else {
            Alert.alert('Error', result.error || 'Failed to reply to tweet');
        }
    };

    const handleCancel = () => {
        clearReplyData();
    };

    return (
        <Modal
            visible={showReplyModal}
            animationType="fade"
            transparent={true}
            onRequestClose={closeReplyModal}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Reply to Tweet</Text>
                        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Original Tweet Preview */}
                        {originalTweet && (
                            <View style={styles.originalTweetContainer}>
                                <Text style={styles.originalTweetLabel}>Replying to:</Text>
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
                            <Text style={styles.label}>Your reply:</Text>
                            <TextInput
                                style={styles.textInput}
                                value={replyContent}
                                onChangeText={setReplyContent}
                                placeholder="Tweet your reply..."
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                maxLength={280}
                                autoFocus={true}
                                returnKeyType="default"
                                blurOnSubmit={false}
                            />
                            <Text style={styles.characterCount}>
                                {replyContent.length}/280
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
                            style={styles.replyButton}
                            onPress={handleReplySubmit}
                        >
                            <Text style={styles.replyButtonText}>Reply</Text>
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
    replyButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    replyButtonText: {
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
