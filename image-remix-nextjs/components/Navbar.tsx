'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../lib/stores/authStore';
import { AuthModal } from './AuthModal';

export default function Navbar() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { isAuthenticated, refreshSession } = useAuthStore();

    const handleLogin = () => {
        setShowAuthModal(false);
    };

    return (
        <>
            <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-6">
                            <Link href="/" className="text-white text-2xl font-bold hover:text-purple-400 transition-colors">
                                Image Remix
                            </Link>
                            <nav className="flex space-x-4">
                                <Link
                                    href="/"
                                    className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Home
                                </Link>
                                <Link
                                    href="/doomscroll"
                                    className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Doomscroll
                                </Link>
                            </nav>
                        </div>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="bg-purple-500 px-4 py-2 rounded-lg text-white hover:bg-purple-600 transition-colors text-sm font-medium"
                        >
                            {isAuthenticated ? 'Account' : 'Sign In'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={handleLogin}
                />
            )}
        </>
    );
} 