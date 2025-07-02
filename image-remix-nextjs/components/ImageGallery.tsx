'use client';

import React, { useEffect, useState } from 'react';
import { useImageStore } from '../lib/stores/imageStore';
import { useAuthStore } from '../lib/stores/authStore';
import { ImageUploader } from './ImageUploader';

type GalleryMode = 'all' | 'my';

export function ImageGallery() {
    const { images, fetchAllImages, fetchUserImages, deleteImage, isLoading, error } = useImageStore();
    const { user, isAuthenticated } = useAuthStore();
    const [showUploader, setShowUploader] = useState(false);
    const [galleryMode, setGalleryMode] = useState<GalleryMode>('all');
    const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

    useEffect(() => {
        if (galleryMode === 'my' && user) {
            fetchUserImages(user.id);
        } else {
            fetchAllImages();
        }
    }, [galleryMode, user]);

    // Filter images based on gallery mode
    const filteredImages = galleryMode === 'my' && user
        ? images.filter(image => image.user_id === user.id)
        : images;

    const handleDeleteImage = async (imageId: string) => {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }

        setDeletingImageId(imageId);
        try {
            const result = await deleteImage(imageId);
            if (result.success) {
                // Refresh the images after successful deletion
                if (galleryMode === 'my' && user) {
                    fetchUserImages(user.id);
                } else {
                    fetchAllImages();
                }
            } else {
                alert(`Failed to delete image: ${result.error}`);
            }
        } catch (error) {
            alert('An error occurred while deleting the image');
        } finally {
            setDeletingImageId(null);
        }
    };

    const canDeleteImage = (imageUserId: string) => {
        return isAuthenticated && user && imageUserId === user.id;
    };

    const fallbackImages = () => {
        const images = [
            '/pics/candy-1.jpg',
            '/pics/candy-2.jpg',
            '/pics/candy-3.jpg',
            '/pics/candy-4.jpg',
            '/pics/candy-5.jpg',
            '/pics/candy-6.jpg',
            '/pics/candy-7.jpg',
            '/pics/candy-8.jpg',
            '/pics/candy-9.jpg',
            '/pics/candy-10.jpg',
            '/pics/candy-11.jpg',
            '/pics/candy-12.jpg',
        ]

        return images[Math.floor(Math.random() * images.length)];
    }

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
                <div className="flex items-center space-x-4">
                    <h3 className="text-white text-xl font-bold">
                        {galleryMode === 'all' ? 'All Images' : 'My Images'} ({filteredImages.length} images)
                    </h3>

                    {/* Gallery Mode Toggle */}
                    <div className="flex bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setGalleryMode('all')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${galleryMode === 'all'
                                ? 'bg-purple-500 text-white'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            All Images
                        </button>
                        <button
                            onClick={() => setGalleryMode('my')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${galleryMode === 'my'
                                ? 'bg-purple-500 text-white'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            My Images
                        </button>
                    </div>
                </div>

                {isAuthenticated && (
                    <button
                        onClick={() => setShowUploader(!showUploader)}
                        className="bg-purple-500 px-4 py-2 rounded-lg text-white hover:bg-purple-600 transition-colors"
                    >
                        {showUploader ? 'Hide Uploader' : 'Upload Image'}
                    </button>
                )}
            </div>

            {showUploader && (
                <div className="mb-4">
                    <ImageUploader />
                </div>
            )}

            {filteredImages.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-400 text-lg">
                        {galleryMode === 'all'
                            ? 'No images found in the gallery'
                            : 'You haven\'t uploaded any images yet'
                        }
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                        {galleryMode === 'all'
                            ? 'Be the first to upload an image!'
                            : 'Upload your first image to get started!'
                        }
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredImages.map((image, index) => (
                        <div
                            key={image.id || `image-${index}`}
                            className="bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <img
                                src={image.url}
                                alt={image.title || 'Image'}
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                    const fallback = fallbackImages();
                                    if (e.currentTarget.src !== window.location.origin + fallback) {
                                        e.currentTarget.src = fallback;
                                    }
                                }}
                            />
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-semibold">
                                        {image.title || 'Untitled'}
                                    </h4>
                                    {canDeleteImage(image.user_id) && (
                                        <button
                                            onClick={() => handleDeleteImage(image.id)}
                                            disabled={deletingImageId === image.id}
                                            className="bg-red-500 hover:bg-red-600 disabled:bg-red-700 text-white text-xs px-2 py-1 rounded transition-colors"
                                            title="Delete image"
                                        >
                                            {deletingImageId === image.id ? (
                                                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                                            ) : (
                                                '🗑️'
                                            )}
                                        </button>
                                    )}
                                </div>
                                {image.description && (
                                    <p className="text-gray-300 text-sm mb-2">
                                        {image.description}
                                    </p>
                                )}
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    {galleryMode === 'all' && (
                                        <span>By: {image.user_id}</span>
                                    )}
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