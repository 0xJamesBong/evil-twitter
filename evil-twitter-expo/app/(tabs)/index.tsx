import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Portal } from 'react-native-paper';

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
    if (initialized && user) {
      if (!backendUser) {
        // Try to fetch existing user, create if doesn't exist
        fetchUser(user.id)
          .then(() => fetchTweets())
          .catch(() => createUser(user).then(() => fetchTweets()));
      } else {
        // Backend user exists, fetch tweets
        fetchTweets();
      }
    }
  }, [initialized, user, backendUser, fetchUser, createUser, fetchTweets]);

  return (
    <>
      <View style={styles.content}>
        {backendUser && <ComposeTweet />}
        <Timeline />
      </View>

      <Portal>
        <FAB
          icon="✍️"
          style={styles.fab}
          onPress={() => { }}
          loading={isSubmitting}
        />
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1DA1F2',
  },
});