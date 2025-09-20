'use client';

import React, { useState, useEffect } from 'react';
import { ComposeTweet } from './ComposeTweet';
import { TweetCard } from './TweetCard';
import { useAuthStore } from '../lib/stores/authStore';

interface Tweet {
    id: string;
    content: string;
    created_at: string;
    likes_count: number;
    retweets_count: number;
    replies_count: number;
    is_liked: boolean;
    is_retweeted: boolean;
    media_urls?: string[];
    author_id: string;
    author_username: string;
    author_display_name: string;
    author_avatar_url?: string;
    author_is_verified: boolean;
}

export function Timeline() {
    const [tweets, setTweets] = useState<Tweet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        fetchTweets();
    }, []);

    const fetchTweets = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3000/tweets');
            if (!response.ok) {
                throw new Error('Failed to fetch tweets');
            }
            const data = await response.json();
            setTweets(data.tweets || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleTweetCreated = (newTweet: Tweet) => {
        setTweets(prev => [newTweet, ...prev]);
    };

    const handleLike = async (tweetId: string) => {
        try {
            const response = await fetch(`http://localhost:3000/tweets/${tweetId}/like`, {
                method: 'POST',
            });
            if (response.ok) {
                setTweets(prev =>
                    prev.map(tweet =>
                        tweet.id === tweetId
                            ? { ...tweet, is_liked: !tweet.is_liked, likes_count: tweet.likes_count + (tweet.is_liked ? -1 : 1) }
                            : tweet
                    )
                );
            }
        } catch (err) {
            console.error('Failed to like tweet:', err);
        }
    };

    if (loading) {
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
                    <ComposeTweet onTweetCreated={handleTweetCreated} />
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
                    tweets.map((tweet) => (
                        <TweetCard
                            key={tweet.id}
                            tweet={tweet}
                            onLike={handleLike}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
