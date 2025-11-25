'use client';

import React from 'react';
import { User, LogOut, Settings, Mail, Calendar } from 'lucide-react';
import { useAuthStore } from '../lib/stores/authStore';

interface UserProfileProps {
    onLogout?: () => void;
    onSettings?: () => void;
}

export function UserProfile({ onLogout, onSettings }: UserProfileProps) {
    const { user, isAuthenticated, isLoading, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await logout();
            onLogout?.();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="p-4 bg-gray-800 rounded-lg m-4">
                <div className="flex items-center mb-4">
                    <User size={24} className="text-gray-400" />
                    <span className="text-gray-400 ml-2 text-lg">Not Logged In</span>
                </div>
                <p className="text-gray-500 text-center">
                    Please log in to view your profile
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-800 rounded-lg m-4">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <p className="text-white text-center mt-2">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-800 rounded-lg m-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-white font-semibold text-lg">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                            {user?.email || 'No email'}
                        </p>
                    </div>
                </div>
                <button
                    className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                    onClick={onSettings}
                >
                    <Settings size={20} className="text-white" />
                </button>
            </div>

            {/* User Info */}
            <div className="space-y-3 mb-4">
                <div className="flex items-center">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-300 ml-2 flex-1">{user?.email}</span>
                </div>

                <div className="flex items-center">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-300 ml-2">
                        Joined {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                    </span>
                </div>

                {user?.last_sign_in_at && (
                    <div className="flex items-center">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-300 ml-2">
                            Last login: {formatDate(user.last_sign_in_at)}
                        </span>
                    </div>
                )}
            </div>

            {/* User Metadata */}
            {user?.user_metadata && Object.keys(user.user_metadata).length > 0 && (
                <div className="mb-4">
                    <h4 className="text-white font-semibold mb-2">Profile Info</h4>
                    <div className="bg-gray-700 rounded-lg p-3">
                        {Object.entries(user.user_metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1">
                                <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-white">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
                <button
                    className="w-full bg-red-500 py-3 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                    onClick={handleLogout}
                >
                    <LogOut size={20} className="text-white" />
                    <span className="text-white font-semibold ml-2">Logout</span>
                </button>
            </div>

            {/* User ID (for debugging) */}
            <div className="mt-4 p-2 bg-gray-700 rounded">
                <p className="text-gray-400 text-xs">User ID:</p>
                <p className="text-gray-300 text-xs font-mono">{user?.id}</p>
            </div>

        </div>
    );
} 