import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FAB, Portal } from 'react-native-paper';

import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { useComposeStore } from '@/lib/stores/composeStore';
import { ComposeTweet } from '@/components/ComposeTweet';
import { Timeline } from '@/components/Timeline';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { RightSidebar } from '@/components/RightSidebar';

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
        createUser(user);
      });
    }
  }, [initialized, user, backendUser, fetchUser, createUser]);

  useEffect(() => {
    if (backendUser) {
      fetchTweets();
    }
  }, [backendUser, fetchTweets]);

  return (
    <View style={styles.webContainer}>
      <Navbar />
      <View style={styles.webMainContent}>
        <View style={styles.webLeftSidebar}>
          <Sidebar />
        </View>
        <View style={styles.webCenterContent}>
          <ScrollView style={styles.webContent}>
            {backendUser && <ComposeTweet />}
            <Timeline />
          </ScrollView>
        </View>
        <View style={styles.webRightSidebar}>
          <RightSidebar />
        </View>
      </View>

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
  // Web layout styles
  webContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webMainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 64,
  },
  webLeftSidebar: {
    width: 256,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  webCenterContent: {
    flex: 1,
    marginRight: 320,
  },
  webRightSidebar: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    padding: 16,
  },
  webContent: {
    flex: 1,
    padding: 16,
  },
  // Mobile layout styles (kept for compatibility)
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