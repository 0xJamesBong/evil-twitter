'use client';

import React from 'react';
import { useAuthStore } from '../../../lib/stores/authStore';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import Navbar from '../../../components/Navbar';

export default function ProfilePage() {
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-black text-white">
                <Navbar />

                <div className="max-w-4xl mx-auto pt-16 px-4">
                    <div className="bg-gray-900 rounded-lg p-8">
                        <div className="flex items-center space-x-6 mb-8">
                            <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-4xl">👤</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">
                                    {user?.user_metadata?.display_name || 'User'}
                                </h1>
                                <p className="text-gray-400 text-lg">
                                    @{user?.user_metadata?.username || 'user'}
                                </p>
                                <p className="text-gray-500">
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-700">
                                        <span className="text-gray-400">Email:</span>
                                        <span className="text-white">{user?.email}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-700">
                                        <span className="text-gray-400">User ID:</span>
                                        <span className="text-white font-mono text-sm">{user?.id}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-700">
                                        <span className="text-gray-400">Created:</span>
                                        <span className="text-white">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-700">
                                        <span className="text-gray-400">Last Sign In:</span>
                                        <span className="text-white">
                                            {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={handleLogout}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
