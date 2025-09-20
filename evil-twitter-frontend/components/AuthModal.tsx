'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../lib/stores/authStore';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                const result = await signUp(email, password, fullName);
                if (result.success) {
                    alert('Check your email to confirm your account!');
                    setIsLogin(true);
                    return;
                }
            }

            onAuthSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Auth error:', error);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            alert('Please enter your email first');
            return;
        }

        try {
            const { resetPassword } = useAuthStore.getState();
            const result = await resetPassword(email);
            if (result.success) {
                alert('Password reset email sent!');
            } else {
                alert(result.error || 'Failed to send reset email');
            }
        } catch (error: any) {
            alert('Failed to send reset email: ' + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white text-xl font-bold">
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-purple-500 py-3 rounded-lg text-white font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                    </button>
                </div>

                {isLogin && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={handleResetPassword}
                            className="text-gray-400 hover:text-gray-300 text-sm"
                        >
                            Forgot your password?
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
} 