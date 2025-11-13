import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AuthModal } from './AuthModal';
import { AppButton } from '@/components/ui';

interface SignInButtonProps {
    style?: ViewStyle;
    textStyle?: TextStyle;
    text?: string;
    onAuthSuccess?: () => void;
}

export function SignInButton({
    style,
    textStyle,
    text = 'Sign In',
    onAuthSuccess
}: SignInButtonProps) {
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        onAuthSuccess?.();
    };

    return (
        <>
            <AppButton
                variant="primary"
                onPress={() => setShowAuthModal(true)}
                style={style}
            >
                {text}
            </AppButton>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAuthSuccess={handleAuthSuccess}
            />
        </>
    );
}

