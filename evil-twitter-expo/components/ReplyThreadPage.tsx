import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ThreadData,
  Tweet,
  useTweetsStore,
} from '@/lib/stores/tweetsStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { TweetCard } from './TweetCard';

interface ReplyThreadPageProps {
  rootTweetId: string;
  onClose?: () => void;
}

const groupRepliesByParent = (replies: Tweet[]): Map<string, Tweet[]> => {
  const map = new Map<string, Tweet[]>();
  replies.forEach((reply) => {
    const parentId = reply.replied_to_tweet_id?.$oid;
    if (!parentId) {
      return;
    }
    const list = map.get(parentId) ?? [];
    list.push(reply);
    map.set(parentId, list);
  });
  map.forEach((list) => {
    list.sort((a, b) => {
      if (a.reply_depth === b.reply_depth) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return (a.reply_depth ?? 0) - (b.reply_depth ?? 0);
    });
  });
  return map;
};

export function ReplyThreadPage({ rootTweetId, onClose }: ReplyThreadPageProps) {
  const {
    threads,
    threadLoading,
    threadError,
    fetchThread,
    replyTweet,
  } = useTweetsStore();
  const { user: currentUser } = useBackendUserStore();

  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const thread: ThreadData | undefined = threads[rootTweetId];

  useEffect(() => {
    if (!thread) {
      fetchThread(rootTweetId);
    }
  }, [fetchThread, rootTweetId, thread]);

  const anchorTweet = thread?.tweet;
  const parents = thread?.parents ?? [];
  const replies = thread?.replies ?? [];
  const repliesByParent = useMemo(
    () => groupRepliesByParent(replies),
    [replies]
  );

  const anchorId = anchorTweet?._id.$oid ?? rootTweetId;

  const renderReplies = (parentId: string, depth: number = 0): React.ReactNode => {
    const children = repliesByParent.get(parentId);
    if (!children || children.length === 0) {
      return null;
    }

    return children.map((child) => (
      <View
        key={child._id.$oid}
        style={[styles.replyContainer, { marginLeft: depth * 20 }]}
      >
        <TweetCard tweet={child} />
        {renderReplies(child._id.$oid, depth + 1)}
      </View>
    ));
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      Alert.alert('Error', 'Please enter some content for your reply');
      return;
    }

    if (!currentUser?._id?.$oid) {
      Alert.alert('Error', 'You must be logged in to reply');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await replyTweet(replyContent.trim(), anchorId);
      if (result.success) {
        setReplyContent('');
        fetchThread(rootTweetId);
        Alert.alert('Success', 'Reply posted successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to post reply');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (threadLoading && !thread) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading thread...</Text>
      </View>
    );
  }

  if (threadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {threadError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchThread(rootTweetId)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!anchorTweet) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Thread not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {parents.length > 0 && (
          <View style={styles.parentChain}>
            {parents.map((parent) => (
              <View key={parent._id.$oid} style={styles.parentItem}>
                <TweetCard tweet={parent} />
              </View>
            ))}
            <View style={styles.divider} />
          </View>
        )}

        <View style={styles.anchorWrapper}>
          <TweetCard tweet={anchorTweet} />
        </View>

        <View style={styles.repliesSection}>
          <Text style={styles.repliesTitle}>
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </Text>
          <View>{renderReplies(anchorId)}</View>
        </View>
      </ScrollView>

      <View style={styles.replyInputContainer}>
        <View style={styles.replyInputHeader}>
          <Text style={styles.replyInputLabel}>Reply to this thread:</Text>
        </View>
        <View style={styles.replyInputRow}>
          <TextInput
            style={styles.replyTextInput}
            value={replyContent}
            onChangeText={setReplyContent}
            placeholder="Tweet your reply..."
            multiline
            textAlignVertical="top"
            maxLength={280}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            onPress={handleReplySubmit}
            style={[
              styles.submitButton,
              (!replyContent.trim() || isSubmitting) && styles.submitButtonDisabled,
            ]}
            disabled={!replyContent.trim() || isSubmitting}
          >
            <Text
              style={[
                styles.submitButtonText,
                (!replyContent.trim() || isSubmitting) && styles.submitButtonTextDisabled,
              ]}
            >
              {isSubmitting ? 'Posting...' : 'Reply'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.characterCount}>{replyContent.length}/280</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 16,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#1DA1F2',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  parentChain: {
    paddingBottom: 12,
  },
  parentItem: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#2f3336',
    marginVertical: 12,
  },
  anchorWrapper: {
    marginBottom: 16,
  },
  repliesSection: {
    gap: 12,
  },
  repliesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  replyContainer: {
    marginBottom: 12,
  },
  replyInputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  replyInputHeader: {
    marginBottom: 8,
  },
  replyInputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  replyTextInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#1DA1F2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#333',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButtonTextDisabled: {
    color: '#666',
  },
  characterCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});
