import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  ThreadData,
  Tweet,
  useTweetsStore,
} from '@/lib/stores/tweetsStore';
import { TweetComponent } from '@/components/TweetComponent';
import { AppText } from '@/components/ui';
import { colors, spacing, radii } from '@/theme';

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
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="bodyLarge" style={{ marginTop: spacing.md }}>Loading tweet...</AppText>
      </View>
    );
  }

  if (!tweetId || typeof tweetId !== 'string' || (!anchorTweet && !tweet)) {
    return (
      <View style={styles.errorContainer}>
        <AppText variant="h3">Tweet not found</AppText>
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
            <ActivityIndicator size="small" color={colors.accent} />
            <AppText variant="caption" color="secondary">Loading replies...</AppText>
          </View>
        )}

        {threadError && (
          <View style={styles.threadError}>
            <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>{threadError}</AppText>
          </View>
        )}

        {!threadLoading && replies.length > 0 && (
          <>
            <AppText variant="h4">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </AppText>
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
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  parentChain: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  parentItem: {
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  anchorWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  repliesSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  replyContainer: {
    marginBottom: spacing.md,
  },
  threadLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  threadError: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
});
