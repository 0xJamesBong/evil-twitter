import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { useAuthStore } from '@/lib/stores/authStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const { login, signUp, isLoading, error } = useAuthStore();

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!isLogin && !fullName) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }

        try {
            if (isLogin) {
                await login(email, password);
                onAuthSuccess?.();
                onClose();
                setEmail('');
                setPassword('');
            } else {
                const result = await signUp(email, password, fullName);
                if (result.success) {
                    Alert.alert(
                        'Success',
                        'Check your email to confirm your account!',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setIsLogin(true);
                                    setEmail('');
                                    setPassword('');
                                    setFullName('');
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert('Error', result.error || 'Failed to sign up');
                }
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            Alert.alert('Error', error.message || 'An error occurred');
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email first');
            return;
        }

        try {
            const { resetPassword } = useAuthStore.getState();
            const result = await resetPassword(email);
            if (result.success) {
                Alert.alert('Success', 'Password reset email sent!');
            } else {
                Alert.alert('Error', result.error || 'Failed to send reset email');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Failed to send reset email: ' + error.message);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setEmail('');
        setPassword('');
        setFullName('');
    };

    return (
        <Modal
            visible={isOpen}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <AppText variant="h2">
                            {isLogin ? 'Sign In' : 'Sign Up'}
                        </AppText>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppText variant="h4" color="secondary">✕</AppText>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                        {!isLogin && (
                            <View style={styles.inputContainer}>
                                <AppText variant="body" style={{ paddingLeft: spacing.md }}>👤</AppText>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    placeholderTextColor={colors.textTertiary}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <AppText variant="body" style={{ paddingLeft: spacing.md }}>📧</AppText>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor={colors.textTertiary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <AppText variant="body" style={{ paddingLeft: spacing.md }}>🔒</AppText>
                            <TextInput
                                style={[styles.input, styles.inputWithIcon]}
                                placeholder="Password"
                                placeholderTextColor={colors.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <AppText variant="body">{showPassword ? '👁️' : '🙈'}</AppText>
                            </TouchableOpacity>
                        </View>

                        {error && (
                            <View style={styles.errorContainer}>
                                <AppText variant="caption" color="danger" style={{ textAlign: 'center' }}>{error}</AppText>
                            </View>
                        )}

                        <AppButton
                            variant="primary"
                            onPress={handleSubmit}
                            disabled={isLoading}
                            loading={isLoading}
                            style={{ marginTop: spacing.sm }}
                        >
                            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </AppButton>

                        <TouchableOpacity onPress={toggleMode} style={styles.toggleButton}>
                            <AppText variant="caption" color="accent">
                                {isLogin
                                    ? "Don't have an account? Sign Up"
                                    : "Already have an account? Sign In"
                                }
                            </AppText>
                        </TouchableOpacity>

                        {isLogin && (
                            <TouchableOpacity onPress={handleResetPassword} style={styles.resetButton}>
                                <AppText variant="caption" color="secondary">Forgot your password?</AppText>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlayStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: colors.bgElevated,
        borderRadius: radii.lg,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.bgSubtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        maxHeight: 500,
    },
    contentContainer: {
        padding: spacing.xl,
        gap: spacing.lg,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSubtle,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        ...typography.body,
    },
    inputWithIcon: {
        paddingRight: spacing['2xl'],
    },
    eyeButton: {
        position: 'absolute',
        right: 0,
        padding: spacing.md,
    },
    errorContainer: {
        backgroundColor: colors.bgSubtle,
        borderRadius: radii.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.danger,
    },
    toggleButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    resetButton: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
});
