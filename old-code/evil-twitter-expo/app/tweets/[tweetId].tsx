import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ThreadData,
  Tweet,
  useTweetsStore,
} from '@/lib/stores/tweetsStore';
import { TweetComponent } from '@/components/TweetComponent';

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

export default function TweetPage() {
  const { tweetId } = useLocalSearchParams<{ tweetId: string }>();
  const {
    fetchTweet,
    fetchThread,
    threads,
    threadLoading,
    threadError,
  } = useTweetsStore();

  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const thread: ThreadData | undefined =
    tweetId && typeof tweetId === 'string' ? threads[tweetId] : undefined;
  const parents = thread?.parents ?? [];
  const replies = thread?.replies ?? [];
  const anchorTweet = thread?.tweet ?? tweet;
  const repliesByParent = useMemo(
    () => groupRepliesByParent(replies),
    [replies]
  );

  const anchorId = anchorTweet?._id.$oid ?? (tweetId as string);

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
        <TweetComponent tweet={child} />
        {renderReplies(child._id.$oid, depth + 1)}
      </View>
    ));
  };

  const loadTweet = async () => {
    if (!tweetId || typeof tweetId !== 'string') return;

    setLoading(true);
    try {
      const tweetData = await fetchTweet(tweetId);
      if (tweetData) {
        setTweet(tweetData);
      }
      await fetchThread(tweetId);
    } catch (error) {
      console.error('Failed to load tweet:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTweet();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTweet();
  }, [tweetId]);

  if (loading && !anchorTweet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading tweet...</Text>
      </View>
    );
  }

  if (!tweetId || typeof tweetId !== 'string' || (!anchorTweet && !tweet)) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tweet not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {parents.length > 0 && (
        <View style={styles.parentChain}>
          {parents.map((parent) => (
            <View key={parent._id.$oid} style={styles.parentItem}>
              <TweetComponent tweet={parent} showActions={false} />
            </View>
          ))}
          <View style={styles.divider} />
        </View>
      )}

      {anchorTweet && (
        <View style={styles.anchorWrapper}>
          <TweetComponent tweet={anchorTweet} />
        </View>
      )}

      <View style={styles.repliesSection}>
        {threadLoading && (
          <View style={styles.threadLoading}>
            <ActivityIndicator size="small" color="#1DA1F2" />
            <Text style={styles.threadLoadingText}>Loading replies...</Text>
          </View>
        )}

        {threadError && (
          <View style={styles.threadError}>
            <Text style={styles.threadErrorText}>{threadError}</Text>
          </View>
        )}

        {!threadLoading && replies.length > 0 && (
          <>
            <Text style={styles.repliesHeader}>
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </Text>
            <View>{renderReplies(anchorId)}</View>
          </>
        )}
      </View>
    </ScrollView>
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
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  parentChain: {
    padding: 16,
    gap: 12,
  },
  parentItem: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#2f3336',
    marginTop: 8,
  },
  anchorWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  repliesSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  repliesHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  replyContainer: {
    marginBottom: 12,
  },
  threadLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  threadLoadingText: {
    color: '#71767b',
  },
  threadError: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2a1a1a',
  },
  threadErrorText: {
    color: '#F44336',
    textAlign: 'center',
  },
});
