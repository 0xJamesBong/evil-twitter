import React from 'react';
import {
    Modal,
    View,
    StyleSheet,
} from 'react-native';
import { useTweetsStore } from '@/lib/stores/tweetsStore';
import { ReplyThreadPage } from './ReplyThreadPage';

export function ReplyThreadModal() {
    const {
        showReplyThreadModal,
        replyThreadTweetId,
        closeReplyThreadModal
    } = useTweetsStore();

    const handleClose = () => {
        closeReplyThreadModal();
    };

    if (!showReplyThreadModal || !replyThreadTweetId) {
        return null;
    }

    return (
        <Modal
            visible={true}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <ReplyThreadPage
                rootTweetId={replyThreadTweetId}
                onClose={handleClose}
            />
        </Modal>
    );
}
