'use client';

import React from 'react';
import { useComposeStore } from '../lib/stores/composeStore';

export function ComposeTweet() {
    const {
        content,
        isSubmitting,
        error,
        remainingChars,
        isOverLimit,
        setContent,
        submitTweet,
    } = useComposeStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitTweet();
    };

    return (
        <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex space-x-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex-shrink-0"></div>

                    {/* Tweet Input */}
                    <div className="flex-1">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's happening?"
                            className="w-full bg-transparent text-white placeholder-gray-500 text-xl resize-none outline-none min-h-[100px]"
                            rows={3}
                        />

                        {error && (
                            <p className="text-red-500 text-sm mt-2">{error}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-blue-500">
                        <button
                            type="button"
                            className="p-2 hover:bg-blue-500 hover:bg-opacity-10 rounded-full transition-colors"
                        >
                            <span className="text-lg">📷</span>
                        </button>
                        <button
                            type="button"
                            className="p-2 hover:bg-blue-500 hover:bg-opacity-10 rounded-full transition-colors"
                        >
                            <span className="text-lg">😊</span>
                        </button>
                        <button
                            type="button"
                            className="p-2 hover:bg-blue-500 hover:bg-opacity-10 rounded-full transition-colors"
                        >
                            <span className="text-lg">📅</span>
                        </button>
                        <button
                            type="button"
                            className="p-2 hover:bg-blue-500 hover:bg-opacity-10 rounded-full transition-colors"
                        >
                            <span className="text-lg">📍</span>
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Character Count */}
                        <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                            {remainingChars}
                        </div>

                        {/* Tweet Button */}
                        <button
                            type="submit"
                            disabled={!content.trim() || isOverLimit || isSubmitting}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-colors flex items-center space-x-2"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <span className="text-lg">📤</span>
                            )}
                            <span>Tweet</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}