import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThreadData, Tweet, useTweetsStore } from '@/lib/stores/tweetsStore';
import { TweetCard } from './TweetCard';

interface ThreadViewProps {
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

export function ThreadView({ rootTweetId, onClose }: ThreadViewProps) {
  const { threads, threadLoading, threadError, fetchThread } = useTweetsStore();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thread</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
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
    </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#1DA1F2',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  parentChain: {
    paddingVertical: 12,
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
    paddingBottom: 24,
    gap: 12,
  },
  repliesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 16,
  },
  replyContainer: {
    marginBottom: 12,
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
});
