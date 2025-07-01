'use client';

import React, { useState } from 'react';
import { apiService } from '../lib/services/api';

export function ApiTest() {
    const [isLoading, setIsLoading] = useState(false);
    const [pingResult, setPingResult] = useState<string>('');

    const testPing = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.ping();
            setPingResult(result);
            alert(`Backend responded: ${result}`);
        } catch (error: any) {
            alert(`Failed to ping backend: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const testGetImages = async () => {
        setIsLoading(true);
        try {
            const images = await apiService.getImages();
            alert(`Found ${images.length} images`);
        } catch (error: any) {
            alert(`Failed to get images: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 bg-gray-800 rounded-lg m-4">
            <h3 className="text-white text-xl font-bold mb-4">API Test</h3>

            <button
                className="w-full bg-blue-500 py-3 rounded-lg mb-4 hover:bg-blue-600 transition-colors disabled:opacity-50"
                onClick={testPing}
                disabled={isLoading}
            >
                <span className="text-white text-center font-semibold">
                    {isLoading ? 'Testing...' : 'Test Ping'}
                </span>
            </button>

            <button
                className="w-full bg-green-500 py-3 rounded-lg mb-4 hover:bg-green-600 transition-colors disabled:opacity-50"
                onClick={testGetImages}
                disabled={isLoading}
            >
                <span className="text-white text-center font-semibold">
                    {isLoading ? 'Loading...' : 'Test Get Images'}
                </span>
            </button>

            {pingResult && (
                <p className="text-green-400 text-center">
                    Last ping result: {pingResult}
                </p>
            )}
        </div>
    );
} 