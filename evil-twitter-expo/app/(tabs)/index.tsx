import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, Portal } from 'react-native-paper';

import { ComposeTweet } from '@/components/ComposeTweet';
import { Timeline } from '@/components/Timeline';
import { useAuthStore } from '@/lib/stores/authStore';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useComposeStore } from '@/lib/stores/composeStore';

export default function Home() {
  const { user, initialized } = useAuthStore();
  const { user: backendUser } = useBackendUserStore();
  const { isSubmitting, clearCompose } = useComposeStore();
  const [composeVisible, setComposeVisible] = useState(false);

  useEffect(() => {
    if (initialized && user && !backendUser) {
      // Try to fetch existing user first
      const { fetchUser, createUser } = useBackendUserStore.getState();
      fetchUser(user.id).catch(async () => {
        // User doesn't exist, create them
        try {
          await createUser(user);
        } catch (error) {
          console.error('Failed to create user:', error);
        }
      });
    }
  }, [initialized, user, backendUser]);

  const handleComposePress = () => {
    setComposeVisible(true);
  };

  const handleComposeClose = () => {
    setComposeVisible(false);
    clearCompose();
  };

  return (
    <>
      {/* <View style={styles.content}> */}
      <Timeline />
      {/* </View> */}

      <Portal>
        <FAB
          icon="✍️"
          style={styles.fab}
          onPress={handleComposePress}
          loading={isSubmitting}
        />
      </Portal>

      {composeVisible && (
        <Portal>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ComposeTweet onClose={handleComposeClose} />
            </View>
          </View>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
});