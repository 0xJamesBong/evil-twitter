import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Dimensions,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    Pressable,
    Platform,
    Alert,
} from "react-native";
import { Image } from "expo-image";
import { X, Plus, Check, Trash2 } from "lucide-react-native";
import CreateImageSidebar from "../create/CreateImageSidebar";
import MasonryList from "@react-native-seoul/masonry-list";
import { useImageStore } from "../../stores/imageStore";
import { useAuthStore } from "../../stores/authStore";

export interface ImageItem {
    id: string;
    url: string;
    width: number;
    height: number;
    description: string;
    author: string;
}

interface ImageGalleryWithAPIProps {
    columns?: number;
    loading?: boolean;
    onEndReached?: () => void;
    initialSidebarOpen?: boolean;
}

const ImageGalleryWithAPI = ({
    columns = 3,
    loading = false,
    onEndReached = () => { },
    initialSidebarOpen = false,
}: ImageGalleryWithAPIProps) => {
    const { images, isLoading, error, fetchAllImages, deleteImage } = useImageStore();
    const { isAuthenticated } = useAuthStore();
    const [selectedColumns, setSelectedColumns] = useState(columns);
    const [showSidebar, setShowSidebar] = useState(initialSidebarOpen);
    const [selectedIngredients, setSelectedIngredients] = useState<ImageItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const screenWidth = Dimensions.get("window").width;

    // Convert store images to ImageItem format
    const apiImages: ImageItem[] = images.map((img) => ({
        id: img.id,
        url: img.url,
        width: 800, // Default width
        height: 600, // Default height
        description: img.description || img.title || "No description",
        author: img.user_id,
    }));

    useEffect(() => {
        // Always fetch images, regardless of authentication status
        fetchAllImages();
    }, [fetchAllImages]);

    useEffect(() => {
        // Calculate column widths
        if (screenWidth > 0 && selectedColumns > 0) {
            const padding = 16;
            const gutter = 8 * (selectedColumns - 1);
            const availableWidth = screenWidth - padding - gutter;
            const widths = Array(selectedColumns).fill(availableWidth / selectedColumns);
            setColumnWidths(widths);
        }
    }, [selectedColumns, screenWidth]);

    const handleImagePress = (image: ImageItem) => {
        setSelectedImage(image);
    };

    const handleDeleteImage = async (imageId: string) => {
        Alert.alert(
            "Delete Image",
            "Are you sure you want to delete this image?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const result = await deleteImage(imageId);
                        if (result.success) {
                            Alert.alert("Success", "Image deleted successfully");
                        } else {
                            Alert.alert("Error", result.error || "Failed to delete image");
                        }
                    },
                },
            ]
        );
    };

    const toggleImageSelection = (image: ImageItem) => {
        setSelectedIngredients((prev) => {
            const isAlreadySelected = prev.some((item) => item.id === image.id);
            if (isAlreadySelected) {
                return prev.filter((item) => item.id !== image.id);
            } else {
                if (prev.length < 5) {
                    return [...prev, image];
                }
                return prev;
            }
        });
    };

    const handleCloseModal = () => {
        setSelectedImage(null);
    };

    const renderImageItem = ({ item, i }: { item: unknown; i: number }) => {
        const imageItem = item as ImageItem;
        const isSelected = selectedIngredients.some((img) => img.id === imageItem.id);
        const isOwner = imageItem.author === useAuthStore.getState().user?.id;

        return (
            <TouchableOpacity
                className="relative"
                onPress={() => handleImagePress(imageItem)}
                onLongPress={() => toggleImageSelection(imageItem)}
            >
                <View className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                    <Image
                        source={{ uri: imageItem.url }}
                        className="w-full h-full"
                        contentFit="cover"
                    />
                    {isSelected && (
                        <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                            <Check size={16} color="white" />
                        </View>
                    )}
                    {isOwner && (
                        <TouchableOpacity
                            className="absolute top-2 left-2 bg-red-500 rounded-full p-1"
                            onPress={() => handleDeleteImage(imageItem.id)}
                        >
                            <Trash2 size={16} color="white" />
                        </TouchableOpacity>
                    )}
                    {imageItem.description && (
                        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                            <Text className="text-white text-sm">{imageItem.description}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (!isAuthenticated) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-white text-lg mb-4">Viewing all images</Text>
                <Text className="text-gray-400 text-sm text-center px-4">
                    Log in to upload your own images and manage your collection
                </Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#fff" />
                <Text className="text-white mt-4">Loading images...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-red-500 text-center">{error}</Text>
                <TouchableOpacity
                    className="bg-blue-500 py-2 px-4 rounded-lg mt-4"
                    onPress={fetchAllImages}
                >
                    <Text className="text-white">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (apiImages.length === 0) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-white text-lg">No images available</Text>
                {isAuthenticated ? (
                    <TouchableOpacity
                        className="bg-purple-500 py-2 px-4 rounded-lg mt-4"
                        onPress={() => setShowSidebar(true)}
                    >
                        <Text className="text-white">Upload Your First Image</Text>
                    </TouchableOpacity>
                ) : (
                    <Text className="text-gray-400 text-sm mt-2">
                        Log in to upload images
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Column Selector */}
            <View className="flex-row justify-center p-4">
                {[2, 3, 4].map((col) => (
                    <TouchableOpacity
                        key={col}
                        className={`mx-1 px-3 py-1 rounded ${selectedColumns === col ? "bg-purple-500" : "bg-gray-700"
                            }`}
                        onPress={() => setSelectedColumns(col)}
                    >
                        <Text className="text-white">{col}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Image Grid */}
            <MasonryList
                data={apiImages}
                keyExtractor={(item) => item.id}
                numColumns={selectedColumns}
                renderItem={renderImageItem}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 8 }}
            />

            {/* Create Sidebar */}
            {showSidebar && (
                <CreateImageSidebar
                    isVisible={showSidebar}
                    onClose={() => setShowSidebar(false)}
                    selectedImages={selectedIngredients.map(img => ({
                        id: img.id,
                        preview: img.url,
                        url: img.url,
                        width: img.width,
                        height: img.height,
                        description: img.description,
                        author: img.author,
                    }))}
                    onClearSelection={() => setSelectedIngredients([])}
                />
            )}

            {/* Image Modal */}
            <Modal
                visible={selectedImage !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <Pressable
                    className="flex-1 bg-black bg-opacity-90 justify-center items-center"
                    onPress={handleCloseModal}
                >
                    {selectedImage && (
                        <View className="w-full h-full justify-center items-center p-4">
                            <Image
                                source={{ uri: selectedImage.url }}
                                className="w-full h-3/4"
                                contentFit="contain"
                            />
                            <View className="mt-4">
                                <Text className="text-white text-center text-lg">
                                    {selectedImage.description}
                                </Text>
                            </View>
                        </View>
                    )}
                </Pressable>
            </Modal>

            {/* Floating Action Button - Only show if authenticated */}
            {isAuthenticated && (
                <TouchableOpacity
                    className="absolute bottom-6 right-6 bg-purple-500 rounded-full p-4 shadow-lg"
                    onPress={() => setShowSidebar(true)}
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default ImageGalleryWithAPI; 