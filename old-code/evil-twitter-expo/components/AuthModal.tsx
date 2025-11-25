import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { useAuthStore } from '@/lib/stores/authStore';

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
                        <Text style={styles.title}>
                            {isLogin ? 'Sign In' : 'Sign Up'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                        {!isLogin && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    placeholderTextColor="#666"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoCapitalize="words"
                                />
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>📧</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#666"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={[styles.input, styles.inputWithIcon]}
                                placeholder="Password"
                                placeholderTextColor="#666"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                            </TouchableOpacity>
                        </View>

                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            <Text style={styles.submitButtonText}>
                                {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleMode} style={styles.toggleButton}>
                            <Text style={styles.toggleText}>
                                {isLogin
                                    ? "Don't have an account? Sign Up"
                                    : "Already have an account? Sign In"
                                }
                            </Text>
                        </TouchableOpacity>

                        {isLogin && (
                            <TouchableOpacity onPress={handleResetPassword} style={styles.resetButton}>
                                <Text style={styles.resetText}>Forgot your password?</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 18,
    },
    content: {
        maxHeight: 500,
    },
    contentContainer: {
        padding: 20,
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    inputIcon: {
        fontSize: 20,
        paddingLeft: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 12,
        fontSize: 16,
    },
    inputWithIcon: {
        paddingRight: 40,
    },
    eyeButton: {
        position: 'absolute',
        right: 0,
        padding: 12,
    },
    eyeIcon: {
        fontSize: 20,
    },
    errorContainer: {
        backgroundColor: '#ff444420',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ff4444',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 14,
        textAlign: 'center',
    },
    submitButton: {
        backgroundColor: '#8B5CF6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#666',
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    toggleButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    toggleText: {
        color: '#8B5CF6',
        fontSize: 14,
    },
    resetButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    resetText: {
        color: '#888',
        fontSize: 14,
    },
});
