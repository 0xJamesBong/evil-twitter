'use client';

import React, { useEffect, useState } from 'react';
import { useImageStore } from '../lib/stores/imageStore';
import { ImageUploader } from './ImageUploader';

export function ImageGallery() {
    const { images, fetchAllImages, isLoading, error } = useImageStore();
    const [showUploader, setShowUploader] = useState(false);

    useEffect(() => {
        fetchAllImages();
    }, []);

    // Filter out images with invalid URLs that cause 404 errors
    const validImages = images.filter(image => {
        // Skip images with /pics/ URLs (old data that causes 404s)
        if (image.url && image.url.startsWith('/pics/')) {
            return false;
        }
        // Skip images with GitHub URLs that might be expired
        if (image.url && image.url.includes('githubusercontent.com')) {
            return false;
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-800 rounded-lg m-4">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <p className="text-white text-center mt-2">Loading images...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-800 rounded-lg m-4">
                <p className="text-white text-center">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-800 rounded-lg m-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-xl font-bold">
                    Image Gallery ({validImages.length} images)
                </h3>
                <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="bg-purple-500 px-4 py-2 rounded-lg text-white hover:bg-purple-600 transition-colors"
                >
                    {showUploader ? 'Hide Uploader' : 'Upload Image'}
                </button>
            </div>

            {showUploader && (
                <div className="mb-4">
                    <ImageUploader />
                </div>
            )}

            {validImages.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400 text-lg">No images found</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Upload your first image to get started!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {validImages.map((image, index) => (
                        <div
                            key={image.id || `image-${index}`}
                            className="bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <img
                                src={image.url}
                                alt={image.title || 'Image'}
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-4">
                                <h4 className="text-white font-semibold mb-2">
                                    {image.title || 'Untitled'}
                                </h4>
                                {image.description && (
                                    <p className="text-gray-300 text-sm mb-2">
                                        {image.description}
                                    </p>
                                )}
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    <span>By: {image.user_id}</span>
                                    <span>
                                        {new Date(image.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 