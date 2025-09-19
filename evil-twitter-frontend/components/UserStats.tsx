'use client';

import React from 'react';
import { Image, Heart, Eye, Upload } from 'lucide-react';
import { useImageStore } from '../lib/stores/imageStore';
import { useAuthStore } from '../lib/stores/authStore';

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
        <div className="p-4 bg-gray-800 rounded-lg m-4">
            <h3 className="text-white font-semibold text-lg mb-3">Your Stats</h3>

            <div className="flex justify-between">
                <div className="flex flex-col items-center flex-1">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-2">
                        <Image size={20} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-lg">{totalImages}</span>
                    <span className="text-gray-400 text-sm text-center">Images</span>
                </div>

                <div className="flex flex-col items-center flex-1">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-2">
                        <Heart size={20} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-lg">{totalLikes}</span>
                    <span className="text-gray-400 text-sm text-center">Likes</span>
                </div>

                <div className="flex flex-col items-center flex-1">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                        <Eye size={20} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-lg">{totalViews}</span>
                    <span className="text-gray-400 text-sm text-center">Views</span>
                </div>
            </div>

            {totalImages === 0 && (
                <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-center">
                        <Upload size={16} className="text-gray-400" />
                        <span className="text-gray-400 ml-2 text-center">
                            Upload your first image to see your stats!
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
} 