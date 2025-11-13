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
import { AppText, AppScreen, Row, Column } from '@/components/ui';
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
      <AppScreen>
        <Column justify="center" align="center" style={{ flex: 1 }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="bodyLarge" style={{ marginTop: spacing.md }}>Loading tweet...</AppText>
        </Column>
      </AppScreen>
    );
  }

  if (!tweetId || typeof tweetId !== 'string' || (!anchorTweet && !tweet)) {
    return (
      <AppScreen padding>
        <Column justify="center" align="center" style={{ flex: 1 }}>
          <AppText variant="h3">Tweet not found</AppText>
        </Column>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {parents.length > 0 && (
          <Column gap="md" style={styles.parentChain}>
            {parents.map((parent) => (
              <View key={parent._id.$oid} style={styles.parentItem}>
                <TweetComponent tweet={parent} showActions={false} />
              </View>
            ))}
            <View style={styles.divider} />
          </Column>
        )}

        {anchorTweet && (
          <View style={styles.anchorWrapper}>
            <TweetComponent tweet={anchorTweet} />
          </View>
        )}

        <Column gap="md" style={styles.repliesSection}>
          {threadLoading && (
            <Row gap="sm" align="center">
              <ActivityIndicator size="small" color={colors.accent} />
              <AppText variant="caption" color="secondary">Loading replies...</AppText>
            </Row>
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
        </Column>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  parentChain: {
    padding: spacing.lg,
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
  },
  replyContainer: {
    marginBottom: spacing.md,
  },
  threadError: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgSubtle,
  },
});
