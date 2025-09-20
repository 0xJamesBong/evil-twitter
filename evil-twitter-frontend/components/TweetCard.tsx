'use client';

import React from 'react';

interface Tweet {
    id: string | { $oid: string };
    content: string;
    created_at: string | { $date: { $numberLong: string } };
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    is_liked: boolean;
    is_retweeted: boolean;
    media_urls?: string[];
    author_id: string | { $oid: string };
    author_username: string | null;
    author_display_name: string;
    author_avatar_url?: string | null;
    author_is_verified?: boolean;
}

interface TweetCardProps {
    tweet: Tweet;
    onLike: (tweetId: string) => void;
}

export function TweetCard({ tweet, onLike }: TweetCardProps) {
    // Helper function to extract ID from either string or ObjectId format
    const getTweetId = () => {
        return typeof tweet.id === 'string' ? tweet.id : tweet.id?.$oid || '';
    };

    // Helper function to format date from either string or MongoDB date format
    const formatTimeAgo = (dateInput: string | { $date: { $numberLong: string } }) => {
        let date: Date;

        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else {
            // Handle MongoDB date format
            const timestamp = parseInt(dateInput.$date.$numberLong);
            date = new Date(timestamp);
        }

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        return date.toLocaleDateString();
    };

    const handleLike = () => {
        onLike(getTweetId());
    };

    return (
        <div className="p-4 hover:bg-gray-900 transition-colors">
            <div className="flex space-x-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gray-600 rounded-full flex-shrink-0 flex items-center justify-center">
                    {tweet.author_avatar_url ? (
                        <img
                            src={tweet.author_avatar_url}
                            alt={tweet.author_display_name}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <div className="text-white text-sm font-medium">
                            {tweet.author_display_name ? tweet.author_display_name.charAt(0).toUpperCase() : "😈"}
                        </div>
                    )}
                </div>

                {/* Tweet Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-white hover:underline cursor-pointer">
                            {tweet.author_display_name}
                        </span>
                        {tweet.author_is_verified && (
                            <span className="text-blue-500">✓</span>
                        )}
                        <span className="text-gray-500">@{tweet.author_username}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 hover:underline cursor-pointer">
                            {formatTimeAgo(tweet.created_at)}
                        </span>
                        <button className="ml-auto p-1 hover:bg-gray-800 rounded-full transition-colors">
                            <span className="text-gray-500">⋯</span>
                        </button>
                    </div>

                    {/* Tweet Text */}
                    <div className="text-white text-base mb-3 whitespace-pre-wrap">
                        {tweet.content}
                    </div>

                    {/* Media */}
                    {tweet.media_urls && tweet.media_urls.length > 0 && (
                        <div className="mb-3 rounded-2xl overflow-hidden">
                            <img
                                src={tweet.media_urls[0]}
                                alt="Tweet media"
                                className="w-full max-h-96 object-cover"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between max-w-md">
                        {/* Reply */}
                        <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors group">
                            <div className="p-2 group-hover:bg-blue-500 group-hover:bg-opacity-10 rounded-full">
                                <span className="text-lg">💬</span>
                            </div>
                            <span className="text-sm">{tweet.replies_count}</span>
                        </button>

                        {/* Retweet */}
                        <button className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors group">
                            <div className="p-2 group-hover:bg-green-500 group-hover:bg-opacity-10 rounded-full">
                                <span className="text-lg">🔄</span>
                            </div>
                            <span className="text-sm">{tweet.retweets_count}</span>
                        </button>

                        {/* Like */}
                        <button
                            onClick={handleLike}
                            className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors group"
                        >
                            <div className="p-2 group-hover:bg-red-500 group-hover:bg-opacity-10 rounded-full">
                                {tweet.is_liked ? (
                                    <span className="text-lg text-red-500">❤️</span>
                                ) : (
                                    <span className="text-lg">🤍</span>
                                )}
                            </div>
                            <span className="text-sm">{tweet.likes_count}</span>
                        </button>

                        {/* Bookmark */}
                        <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors group">
                            <div className="p-2 group-hover:bg-blue-500 group-hover:bg-opacity-10 rounded-full">
                                <span className="text-lg">🔖</span>
                            </div>
                        </button>

                        {/* Share */}
                        <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors group">
                            <div className="p-2 group-hover:bg-blue-500 group-hover:bg-opacity-10 rounded-full">
                                <span className="text-lg">📤</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}