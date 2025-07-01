import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { User, LogOut, Settings, Mail, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../stores/authStore';

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
            <View className="p-4 bg-gray-800 rounded-lg m-4">
                <View className="flex-row items-center mb-4">
                    <User size={24} color="#6b7280" />
                    <Text className="text-gray-400 ml-2 text-lg">Not Logged In</Text>
                </View>
                <Text className="text-gray-500 text-center">
                    Please log in to view your profile
                </Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="p-4 bg-gray-800 rounded-lg m-4">
                <ActivityIndicator size="large" color="#fff" />
                <Text className="text-white text-center mt-2">Loading profile...</Text>
            </View>
        );
    }

    return (
        <View className="p-4 bg-gray-800 rounded-lg m-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-purple-500 rounded-full items-center justify-center">
                        <Text className="text-white font-bold text-lg">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View className="ml-3">
                        <Text className="text-white font-semibold text-lg">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                            {user?.email || 'No email'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    className="p-2 bg-gray-700 rounded-full"
                    onPress={onSettings}
                >
                    <Settings size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* User Info */}
            <View className="space-y-3 mb-4">
                <View className="flex-row items-center">
                    <Mail size={16} color="#6b7280" />
                    <Text className="text-gray-300 ml-2 flex-1">{user?.email}</Text>
                </View>

                <View className="flex-row items-center">
                    <Calendar size={16} color="#6b7280" />
                    <Text className="text-gray-300 ml-2">
                        Joined {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                    </Text>
                </View>

                {user?.last_sign_in_at && (
                    <View className="flex-row items-center">
                        <User size={16} color="#6b7280" />
                        <Text className="text-gray-300 ml-2">
                            Last login: {formatDate(user.last_sign_in_at)}
                        </Text>
                    </View>
                )}
            </View>

            {/* User Metadata */}
            {user?.user_metadata && Object.keys(user.user_metadata).length > 0 && (
                <View className="mb-4">
                    <Text className="text-white font-semibold mb-2">Profile Info</Text>
                    <View className="bg-gray-700 rounded-lg p-3">
                        {Object.entries(user.user_metadata).map(([key, value]) => (
                            <View key={key} className="flex-row justify-between py-1">
                                <Text className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</Text>
                                <Text className="text-white">{String(value)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Actions */}
            <View className="space-y-2">
                <TouchableOpacity
                    className="bg-red-500 py-3 rounded-lg flex-row items-center justify-center"
                    onPress={handleLogout}
                >
                    <LogOut size={20} color="#fff" />
                    <Text className="text-white font-semibold ml-2">Logout</Text>
                </TouchableOpacity>
            </View>

            {/* User ID (for debugging) */}
            <View className="mt-4 p-2 bg-gray-700 rounded">
                <Text className="text-gray-400 text-xs">User ID:</Text>
                <Text className="text-gray-300 text-xs font-mono">{user?.id}</Text>
            </View>
        </View>
    );
} 