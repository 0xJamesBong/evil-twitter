import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { apiService } from '../services/api';

export function ApiTest() {
    const [isLoading, setIsLoading] = useState(false);
    const [pingResult, setPingResult] = useState<string>('');

    const testPing = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.ping();
            setPingResult(result);
            Alert.alert('Success', `Backend responded: ${result}`);
        } catch (error: any) {
            Alert.alert('Error', `Failed to ping backend: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const testGetImages = async () => {
        setIsLoading(true);
        try {
            const images = await apiService.getImages();
            Alert.alert('Success', `Found ${images.length} images`);
        } catch (error: any) {
            Alert.alert('Error', `Failed to get images: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="p-4 bg-gray-800 rounded-lg m-4">
            <Text className="text-white text-xl font-bold mb-4">API Test</Text>

            <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg mb-4"
                onPress={testPing}
                disabled={isLoading}
            >
                <Text className="text-white text-center font-semibold">
                    {isLoading ? 'Testing...' : 'Test Ping'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className="bg-green-500 py-3 rounded-lg mb-4"
                onPress={testGetImages}
                disabled={isLoading}
            >
                <Text className="text-white text-center font-semibold">
                    {isLoading ? 'Loading...' : 'Test Get Images'}
                </Text>
            </TouchableOpacity>

            {pingResult && (
                <Text className="text-green-400 text-center">
                    Last ping result: {pingResult}
                </Text>
            )}
        </View>
    );
} 