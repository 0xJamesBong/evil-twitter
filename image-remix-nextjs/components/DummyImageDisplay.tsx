'use client';

import React from 'react';

export function DummyImageDisplay() {
    const imageUrl = "https://raw.githubusercontent.com/0xJamesBong/image-remix/refs/heads/main/stock-image/men/men.1.jpg?token=GHSAT0AAAAAADAVO7HJVCANPYOJIJBKWLGC2DEK3BA";


    return (
        <div className="p-4 bg-gray-800 rounded-lg m-4">
            <h3 className="text-white text-xl font-bold mb-4">Dummy Image Display</h3>
            <div className="bg-gray-700 rounded-lg overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Daniel Craig"
                    className="w-full h-64 object-cover"
                />
                <div className="p-4">
                    <h4 className="text-white font-semibold mb-2">Daniel Craig</h4>
                    <p className="text-gray-300 text-sm">This is a test image from the backend</p>
                    <div className="mt-2 text-xs text-gray-400">
                        URL: {imageUrl.substring(0, 50)}...
                    </div>
                </div>
            </div>
        </div>
    );
} 