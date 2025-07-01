import React from 'react';
import { View, Text } from 'react-native';
import { Image, Heart, Eye, Upload } from 'lucide-react-native';
import { useImageStore } from '../stores/imageStore';
import { useAuthStore } from '../stores/authStore';

export function UserStats() {
    const { images } = useImageStore();
    const { user, isAuthenticated } = useAuthStore();

    if (!isAuthenticated || !user) {
        return null;
    }

    // Count user's images
    const userImages = images.filter(img => img.user_id === user.id);
    const totalImages = userImages.length;

    // Mock stats for now - in a real app, these would come from the backend
    const totalLikes = userImages.reduce((sum, img) => sum + (img.tags?.length || 0), 0);
    const totalViews = totalImages * 42; // Mock view count

    return (
        <View className="p-4 bg-gray-800 rounded-lg m-4">
            <Text className="text-white font-semibold text-lg mb-3">Your Stats</Text>

            <View className="flex-row justify-between">
                <View className="items-center flex-1">
                    <View className="w-12 h-12 bg-purple-500 rounded-full items-center justify-center mb-2">
                        <Image size={20} color="#fff" />
                    </View>
                    <Text className="text-white font-bold text-lg">{totalImages}</Text>
                    <Text className="text-gray-400 text-sm text-center">Images</Text>
                </View>

                <View className="items-center flex-1">
                    <View className="w-12 h-12 bg-red-500 rounded-full items-center justify-center mb-2">
                        <Heart size={20} color="#fff" />
                    </View>
                    <Text className="text-white font-bold text-lg">{totalLikes}</Text>
                    <Text className="text-gray-400 text-sm text-center">Likes</Text>
                </View>

                <View className="items-center flex-1">
                    <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mb-2">
                        <Eye size={20} color="#fff" />
                    </View>
                    <Text className="text-white font-bold text-lg">{totalViews}</Text>
                    <Text className="text-gray-400 text-sm text-center">Views</Text>
                </View>
            </View>

            {totalImages === 0 && (
                <View className="mt-4 p-3 bg-gray-700 rounded-lg">
                    <View className="flex-row items-center justify-center">
                        <Upload size={16} color="#6b7280" />
                        <Text className="text-gray-400 ml-2 text-center">
                            Upload your first image to see your stats!
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
} 