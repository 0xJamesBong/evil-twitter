'use client';

import React from 'react';
import { useTweetsStore } from '../lib/stores/tweetsStore';

interface Tweet {
    id: string | { $oid: string };
    content: string;
    tweet_type: "Original" | "Retweet" | "Quote";
    original_tweet_id?: string | { $oid: string };
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
    onRetweet: (tweetId: string) => void;
    onQuote: (tweetId: string, content: string) => void;
}

export function TweetCard({ tweet, onLike, onRetweet, onQuote }: TweetCardProps) {
    const {
        showQuoteModal,
        quoteTweetId,
        quoteContent,
        openQuoteModal,
        closeQuoteModal,
        setQuoteContent,
        clearQuoteData
    } = useTweetsStore();

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

    const handleRetweet = () => {
        onRetweet(getTweetId());
    };

    const handleQuote = () => {
        openQuoteModal(getTweetId());
    };

    const handleQuoteSubmit = () => {
        if (quoteContent.trim()) {
            onQuote(getTweetId(), quoteContent.trim());
            clearQuoteData();
        }
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

                    {/* Tweet Type Indicator */}
                    {tweet.tweet_type === "Retweet" && (
                        <div className="flex items-center text-gray-500 text-sm mb-2">
                            <span className="mr-2">🔄</span>
                            <span>Retweeted</span>
                        </div>
                    )}
                    {tweet.tweet_type === "Quote" && (
                        <div className="flex items-center text-gray-500 text-sm mb-2">
                            <span className="mr-2">💬</span>
                            <span>Quoted</span>
                        </div>
                    )}

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
                        <button
                            onClick={handleRetweet}
                            className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors group"
                        >
                            <div className="p-2 group-hover:bg-green-500 group-hover:bg-opacity-10 rounded-full">
                                <span className="text-lg">🔄</span>
                            </div>
                            <span className="text-sm">{tweet.retweets_count}</span>
                        </button>

                        {/* Quote */}
                        <button
                            onClick={handleQuote}
                            className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors group"
                        >
                            <div className="p-2 group-hover:bg-blue-500 group-hover:bg-opacity-10 rounded-full">
                                <span className="text-lg">💬</span>
                            </div>
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

            {/* Quote Tweet Modal */}
            {showQuoteModal && quoteTweetId === getTweetId() && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-white text-lg font-semibold mb-4">Quote Tweet</h3>
                        <textarea
                            value={quoteContent}
                            onChange={(e) => setQuoteContent(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full h-24 bg-gray-800 text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={280}
                        />
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                onClick={closeQuoteModal}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleQuoteSubmit}
                                disabled={!quoteContent.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                Quote Tweet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}