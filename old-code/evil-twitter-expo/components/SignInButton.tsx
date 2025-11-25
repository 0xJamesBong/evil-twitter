import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { AuthModal } from './AuthModal';

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
            <TouchableOpacity
                style={[styles.button, style]}
                onPress={() => setShowAuthModal(true)}
            >
                <Text style={[styles.text, textStyle]}>{text}</Text>
            </TouchableOpacity>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAuthSuccess={handleAuthSuccess}
            />
        </>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#1DA1F2',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

