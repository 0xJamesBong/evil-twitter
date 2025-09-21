'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../lib/stores/authStore';
import { AuthModal } from './AuthModal';
import { TestPing } from './TestPing';

export default function Navbar() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { isAuthenticated, user, logout } = useAuthStore();

    const handleLogin = () => {
        setShowAuthModal(false);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={handleLogin}
                />
            )}

            {/* Navbar Content */}
            <nav className="bg-gray-900 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <TestPing />
                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link href="/" className="text-2xl font-bold text-white">
                                Evil Twitter
                            </Link>
                        </div>

                        {/* Navigation */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                    Home
                                </Link>
                                <Link href="/explore" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                    Explore
                                </Link>
                                <Link href="/notifications" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                    Notifications
                                </Link>
                            </div>
                        </div>

                        {/* Auth Section */}
                        <div className="flex items-center space-x-4">

                            {isAuthenticated && user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-white text-sm">
                                        Welcome, {user.user_metadata?.display_name || user.email}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Login
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
} 