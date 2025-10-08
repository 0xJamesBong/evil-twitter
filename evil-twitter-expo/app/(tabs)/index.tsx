import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, FAB, Portal } from 'react-native-paper';

import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useComposeStore } from '@/lib/stores/composeStore';
import { ComposeTweet } from '@/components/ComposeTweet';
import { Timeline } from '@/components/Timeline';

export default function HomeScreen() {
  const { user, initialized } = useAuthStore();
  const { user: backendUser, fetchUser, createUser } = useBackendUserStore();
  const { tweets, fetchTweets } = useTweetsStore();
  const { isSubmitting } = useComposeStore();

  useEffect(() => {
    if (initialized && user && !backendUser) {
      // Try to fetch existing user, create if doesn't exist
      fetchUser(user.id).catch(() => {
        // User doesn't exist, create them
        createUser({
          supabase_id: user.id,
          username: user.email?.split('@')[0] || 'user',
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url,
          bio: '',
          follower_count: 0,
          following_count: 0,
          dollar_rate: 1.0,
          weapon_ids: [],
        });
      });
    }
  }, [initialized, user, backendUser, fetchUser, createUser]);

  useEffect(() => {
    if (backendUser) {
      fetchTweets();
    }
  }, [backendUser, fetchTweets]);

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="😈 Evil Twitter" />
        <Appbar.Action icon="🔍" onPress={() => { }} />
        <Appbar.Action icon="⚙️" onPress={() => { }} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {backendUser && <ComposeTweet />}
        <Timeline tweets={tweets} />
      </ScrollView>

      <Portal>
        <FAB
          icon="✍️"
          style={styles.fab}
          onPress={() => { }}
          loading={isSubmitting}
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1DA1F2',
  },
});