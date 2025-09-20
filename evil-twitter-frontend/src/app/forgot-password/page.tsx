'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useAuthStore } from '../../../lib/stores/authStore';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { resetPassword, isLoading, error } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const result = await resetPassword(email);
            if (result.success) {
                setIsSubmitted(true);
            }
        } catch (error) {
            console.error('Reset password error:', error);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="max-w-md w-full space-y-8 p-8 text-center">
                    <div className="text-green-400 text-6xl mb-4">✓</div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Check your email
                    </h2>
                    <p className="text-gray-400 mb-6">
                        We've sent a password reset link to {email}
                    </p>
                    <Link
                        href="/login"
                        className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="max-w-md w-full space-y-8 p-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-400">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-purple-500 py-3 rounded-lg text-white font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send reset link'}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="text-sm text-gray-400 hover:text-gray-300"
                        >
                            Back to login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
