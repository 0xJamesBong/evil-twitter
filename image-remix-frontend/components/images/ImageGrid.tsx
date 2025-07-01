import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useImageStore } from '../../stores/imageStore';
import { useAuthStore } from '../../stores/authStore';

interface ImageGridProps {
    onImagePress?: (image: any) => void;
}

export function ImageGrid({ onImagePress }: ImageGridProps) {
    const { images, isLoading, error, fetchAllImages } = useImageStore();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        // Always fetch images, regardless of authentication status
        fetchAllImages();
    }, [fetchAllImages]);

    if (!isAuthenticated) {
        return (
            <View className="p-4">
                <Text className="text-white text-center">Please log in to view your images</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="p-4">
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="p-4">
                <Text className="text-red-500 text-center">{error}</Text>
            </View>
        );
    }

    if (images.length === 0) {
        return (
            <View className="p-4">
                <Text className="text-white text-center">No images uploaded yet</Text>
            </View>
        );
    }

    return (
        <View className="flex-row flex-wrap p-2">
            {images.map((image) => (
                <TouchableOpacity
                    key={image.id}
                    className="w-1/2 p-2"
                    onPress={() => onImagePress?.(image)}
                >
                    <View className="aspect-square rounded-lg overflow-hidden">
                        <Image
                            source={{ uri: image.url }}
                            className="w-full h-full"
                            contentFit="cover"
                        />
                        {image.title && (
                            <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                                <Text className="text-white text-sm">{image.title}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
} 