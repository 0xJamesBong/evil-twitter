import React from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { ThreadView } from './ThreadView';

export function ThreadModal() {
    const { threads, clearAllThreads } = useTweetsStore();

    // Get the first thread (for now, we'll support one thread at a time)
    const threadIds = Object.keys(threads);
    const currentThreadId = threadIds[0];

    const handleClose = () => {
        clearAllThreads();
    };

    if (!currentThreadId) {
        return null;
    }

    return (
        <Modal
            visible={true}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <ThreadView
                rootTweetId={currentThreadId}
                onClose={handleClose}
            />
        </Modal>
    );
}
