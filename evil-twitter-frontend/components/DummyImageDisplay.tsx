'use client';

import React from 'react';

export function DummyImageDisplay() {
    // Use a local image from the public directory instead of the problematic GitHub URL
    const imageUrl = "/pics/candy-1.jpg";

    return (
        <div className="p-4 bg-gray-800 rounded-lg m-4">
            <h3 className="text-white text-xl font-bold mb-4">Dummy Image Display</h3>
            <div className="bg-gray-700 rounded-lg overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Sample Image"
                    className="w-full h-64 object-cover"
                />
                <div className="p-4">
                    <h4 className="text-white font-semibold mb-2">Sample Image</h4>
                    <p className="text-gray-300 text-sm">This is a test image from the public directory</p>
                    <div className="mt-2 text-xs text-gray-400">
                        URL: {imageUrl}
                    </div>
                </div>
            </div>
        </div>
    );
} 