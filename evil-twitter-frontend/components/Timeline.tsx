'use client';

import React, { useEffect } from 'react';
import { ComposeTweet } from './ComposeTweet';
import { TweetCard } from './TweetCard';
import { useAuthStore } from '../lib/stores/authStore';
import { useTweetsStore } from '../lib/stores/tweetsStore';

export function Timeline() {
    const { isAuthenticated } = useAuthStore();
    const {
        tweets,
        isLoading,
        error,
        fetchTweets,
        likeTweet
    } = useTweetsStore();

    useEffect(() => {
        fetchTweets();
    }, [fetchTweets]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-500">Error: {error}</p>
                <button
                    onClick={fetchTweets}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="border-l border-r border-gray-800 min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-black bg-opacity-80 backdrop-blur-sm border-b border-gray-800 p-4">
                <h1 className="text-xl font-bold">Home</h1>
            </div>

            {/* Compose Tweet */}
            {isAuthenticated ? (
                <div className="border-b border-gray-800">
                    <ComposeTweet />
                </div>
            ) : (
                <div className="border-b border-gray-800 p-6 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Welcome to Evil Twitter</h2>
                    <p className="text-gray-400 mb-4">Sign in to see tweets and join the conversation!</p>
                    <a
                        href="/login"
                        className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-full transition-colors"
                    >
                        Sign In
                    </a>
                </div>
            )}

            {/* Tweets */}
            <div className="divide-y divide-gray-800">
                {tweets.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>{isAuthenticated ? 'No tweets yet. Be the first to tweet!' : 'Sign in to see tweets'}</p>
                    </div>
                ) : (
                    tweets.map((tweet, index) => (
                        <TweetCard
                            key={tweet.id || `tweet-${index}`}
                            tweet={tweet}
                            onLike={() => likeTweet(tweet.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
