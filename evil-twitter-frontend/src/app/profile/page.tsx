'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useBackendUserStore } from '../../../lib/stores/backendUserStore';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import Navbar from '../../../components/Navbar';

export default function ProfilePage() {
    const { user, logout } = useAuthStore();
    const { user: backendUser, fetchUser, isLoading: backendLoading, balances, fetchBalances } = useBackendUserStore();

    const handleSyncWithSupabase = async () => {
        if (user?.id) {
            console.log('Syncing with Supabase', user);
            await useBackendUserStore.getState().syncWithSupabase(user);
        }
    };
    // Fetch backend user data when component mounts
    useEffect(() => {
        if (user?.id) {
            fetchUser(user.id);
        }
    }, [user?.id, fetchUser]);

    // Fetch token balances
    useEffect(() => {
        if (backendUser?._id?.$oid) {
            fetchBalances(backendUser._id.$oid);
        }
    }, [backendUser?._id?.$oid, fetchBalances]);

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
                                        <span className="text-gray-400">Supabase User ID:</span>
                                        <span className="text-white font-mono text-sm">{user?.id}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-700">
                                        <span className="text-gray-400">Backend User ID:</span>
                                        <span className="text-white font-mono text-sm">
                                            {backendUser?._id?.$oid || 'Not loaded'}
                                        </span>
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

                            {/* Backend User Stats */}
                            {backendUser && (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Profile Stats</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-white">{backendUser.tweets_count}</div>
                                            <div className="text-gray-400 text-sm">Tweets</div>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-white">{backendUser.followers_count}</div>
                                            <div className="text-gray-400 text-sm">Followers</div>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-white">{backendUser.following_count}</div>
                                            <div className="text-gray-400 text-sm">Following</div>
                                        </div>
                                        <div className="bg-purple-500 rounded-lg p-4 text-center">
                                            <div className="text-2xl font-bold text-white">${backendUser.dollar_conversion_rate.toLocaleString()}</div>
                                            <div className="text-purple-200 text-sm">Dollar Rate</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Token Balances */}
                            {balances && (
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-white mb-4">💰 Token Balances</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-center border-2 border-purple-400">
                                            <div className="text-3xl mb-2">💎</div>
                                            <div className="text-2xl font-bold text-white">
                                                {balances['Bling']?.toLocaleString() || '0'}
                                            </div>
                                            <div className="text-purple-200 text-sm font-semibold">BLING</div>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                                            <div className="text-3xl mb-2">💵</div>
                                            <div className="text-2xl font-bold text-white">
                                                {balances['Dooler']?.toLocaleString() || '0'}
                                            </div>
                                            <div className="text-gray-400 text-sm">DOOLER</div>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                                            <div className="text-3xl mb-2">💲</div>
                                            <div className="text-2xl font-bold text-white">
                                                {balances['Usdc']?.toLocaleString() || '0'}
                                            </div>
                                            <div className="text-gray-400 text-sm">USDC</div>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg p-4 text-center">
                                            <div className="text-3xl mb-2">◎</div>
                                            <div className="text-2xl font-bold text-white">
                                                {balances['Sol']?.toLocaleString() || '0'}
                                            </div>
                                            <div className="text-gray-400 text-sm">SOL</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {backendLoading && (
                                <div className="text-center py-4">
                                    <div className="text-gray-400">Loading profile stats...</div>
                                </div>
                            )}

                            {!backendUser && !backendLoading && (
                                <div className="text-center py-4">
                                    <div className="text-gray-400">Profile stats not available</div>
                                </div>
                            )}
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                        <div className="pt-6">
                            <button
                                onClick={handleSyncWithSupabase}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                            >
                                Sync with Supabase
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
