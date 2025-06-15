import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useImageStore } from '../../stores/imageStore';
import { useAuthStore } from '../../stores/authStore';

interface ImageUploaderProps {
    onUploadComplete?: () => void;
}

export function ImageUploader({ onUploadComplete }: ImageUploaderProps) {
    const { uploadImage, isLoading } = useImageStore();
    const { isAuthenticated } = useAuthStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                Alert.alert('Error', 'File size must be less than 5MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!isAuthenticated) {
            Alert.alert('Error', 'Please log in to upload images');
            return;
        }

        if (!selectedFile) {
            Alert.alert('Error', 'Please select an image to upload');
            return;
        }

        try {
            const { success, error } = await uploadImage(selectedFile, {
                title: title.trim() || undefined,
                description: description.trim() || undefined,
                tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
            });

            if (success) {
                Alert.alert('Success', 'Image uploaded successfully');
                setTitle('');
                setDescription('');
                setTags('');
                setSelectedFile(null);
                onUploadComplete?.();
            } else {
                Alert.alert('Error', error || 'Failed to upload image');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An error occurred');
        }
    };

    return (
        <View className="p-4 bg-gray-800 rounded-lg">
            <Text className="text-white text-xl font-bold mb-4">Upload Image</Text>

            <View className="mb-4">
                <TouchableOpacity
                    className="bg-blue-500 py-2 px-4 rounded-lg"
                    onPress={() => document.getElementById('fileInput')?.click()}
                >
                    <Text className="text-white text-center">
                        {selectedFile ? 'Change Image' : 'Select Image'}
                    </Text>
                </TouchableOpacity>
                <input
                    id="fileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                {selectedFile && (
                    <Text className="text-gray-300 mt-2">
                        Selected: {selectedFile.name}
                    </Text>
                )}
            </View>

            <TextInput
                className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white mb-4"
                placeholder="Title (optional)"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#666"
            />

            <TextInput
                className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white mb-4"
                placeholder="Description (optional)"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
            />

            <TextInput
                className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white mb-4"
                placeholder="Tags (comma-separated)"
                value={tags}
                onChangeText={setTags}
                placeholderTextColor="#666"
            />

            <TouchableOpacity
                className="bg-purple-500 py-3 rounded-lg items-center"
                onPress={handleUpload}
                disabled={isLoading || !selectedFile}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-semibold">Upload</Text>
                )}
            </TouchableOpacity>
        </View>
    );
} 