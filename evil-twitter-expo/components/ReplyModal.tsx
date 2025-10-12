import React, { useState, useEffect } from 'react';
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
    const [localContent, setLocalContent] = useState('');

    // Find the original tweet being replied to
    const originalTweet = tweets.find(tweet => tweet._id.$oid === replyTweetId);

    // Sync local state with store state
    useEffect(() => {
        if (showReplyModal) {
            setLocalContent(replyContent);
        }
    }, [showReplyModal, replyContent]);

    const handleContentChange = (text: string) => {
        console.log('ReplyModal handleContentChange called with:', text);
        setLocalContent(text);
        setReplyContent(text);
    };

    const handleReplySubmit = async () => {
        if (!localContent.trim()) {
            Alert.alert('Error', 'Please enter some content for your reply');
            return;
        }

        if (!currentUser?._id?.$oid || !replyTweetId) {
            Alert.alert('Error', 'Unable to reply to tweet');
            return;
        }

        const result = await replyTweet(localContent.trim(), replyTweetId, currentUser._id.$oid);

        if (result.success) {
            Alert.alert('Success', 'Reply posted successfully!');
            clearReplyData();
            setLocalContent('');
        } else {
            Alert.alert('Error', result.error || 'Failed to reply to tweet');
        }
    };

    const handleCancel = () => {
        clearReplyData();
        setLocalContent('');
    };

    if (!showReplyModal) {
        return null;
    }

    return (
        <Modal
            visible={showReplyModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeReplyModal}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Reply to Tweet</Text>
                    <TouchableOpacity
                        onPress={handleReplySubmit}
                        style={[
                            styles.replyButton,
                            !localContent.trim() && styles.replyButtonDisabled
                        ]}
                        disabled={!localContent.trim()}
                    >
                        <Text style={[
                            styles.replyButtonText,
                            !localContent.trim() && styles.replyButtonTextDisabled
                        ]}>
                            Reply
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
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

                    {/* Reply Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Your reply:</Text>

                        {/* Test simple TextInput */}
                        <TextInput
                            style={[styles.textInput, { marginBottom: 8 }]}
                            value={localContent}
                            onChangeText={(text) => {
                                console.log('Simple TextInput onChangeText:', text);
                                setLocalContent(text);
                                setReplyContent(text);
                            }}
                            placeholder="Type here to test..."
                        />

                        {/* Original TextInput */}
                        <TextInput
                            style={styles.textInput}
                            value={localContent}
                            onChangeText={handleContentChange}
                            onFocus={() => console.log('ReplyModal TextInput focused')}
                            onBlur={() => console.log('ReplyModal TextInput blurred')}
                            placeholder="Tweet your reply..."
                            multiline
                            textAlignVertical="top"
                            maxLength={280}
                            autoFocus={true}
                            returnKeyType="default"
                            blurOnSubmit={false}
                        />
                        <Text style={styles.characterCount}>
                            {localContent.length}/280
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
    replyButton: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    replyButtonDisabled: {
        backgroundColor: '#333',
    },
    replyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    replyButtonTextDisabled: {
        color: '#666',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    originalTweetContainer: {
        marginBottom: 16,
    },
    originalTweetLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
    },
    originalTweet: {
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#333',
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
        backgroundColor: '#1DA1F2',
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
        lineHeight: 20,
    },
    inputContainer: {
        flex: 1,
    },
    inputLabel: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        padding: 12,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    characterCount: {
        color: '#888',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
});
