'use client';

import React, { useState, useEffect } from 'react';
import { apiService, BackendImage } from '../../../lib/services/api';

export default function DoomscrollPage() {
    const [images, setImages] = useState<BackendImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [columns, setColumns] = useState(3);
    const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

    const columnOptions = [1, 3, 5, 7, 9];

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedImages = await apiService.getImages();
            setImages(fetchedImages);
        } catch (err) {
            console.error('Failed to load images:', err);
            setError('Failed to load images');
        } finally {
            setLoading(false);
        }
    };

    const handleImageError = (imageId: string) => {
        setImageLoadErrors(prev => new Set(prev).add(imageId));
    };

    const getColumnImages = (columnIndex: number) => {
        return images.filter((_, index) => index % columns === columnIndex);
    };

    const getImageUrl = (image: BackendImage) => {
        // Handle both old and new URL formats
        if (image.url.startsWith('http')) {
            return image.url;
        }
        return `http://localhost:3000${image.url}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-300">Loading images...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={loadImages}
                        className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Header with column controls */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-white text-2xl font-bold">Doomscroll</h1>

                        {/* Column selector */}
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-300 text-sm">Columns:</span>
                            <div className="flex bg-gray-800 rounded-lg p-1">
                                {columnOptions.map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setColumns(option)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${columns === option
                                                ? 'bg-purple-500 text-white'
                                                : 'text-gray-300 hover:text-white'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>

                            <span className="text-gray-400 text-sm">
                                {images.length} images
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Masonry grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {images.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">No images found</p>
                        <p className="text-gray-500 text-sm mt-2">Upload some images to get started!</p>
                    </div>
                ) : (
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {Array.from({ length: columns }, (_, columnIndex) => (
                            <div key={columnIndex} className="space-y-4">
                                {getColumnImages(columnIndex).map((image) => {
                                    const imageUrl = getImageUrl(image);
                                    const hasError = imageLoadErrors.has(image.id || image._id?.$oid || '');

                                    return (
                                        <div
                                            key={image.id || image._id?.$oid}
                                            className="relative group overflow-hidden rounded-lg bg-gray-800"
                                        >
                                            {!hasError ? (
                                                <img
                                                    src={imageUrl}
                                                    alt=""
                                                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                                                    onError={() => handleImageError(image.id || image._id?.$oid || '')}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="aspect-square bg-gray-700 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <div className="text-gray-400 text-4xl mb-2">🖼️</div>
                                                        <p className="text-gray-500 text-xs">Image failed to load</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Infinite scroll indicator */}
            {images.length > 0 && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center space-x-2 text-gray-400">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-sm">Scroll for more</span>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
            )}
        </div>
    );
} 