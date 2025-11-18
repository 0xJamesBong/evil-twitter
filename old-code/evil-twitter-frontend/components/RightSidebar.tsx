'use client';

import React, { useState, useEffect } from 'react';
import { AssetsPanel } from './AssetsPanel';
import { useBackendUserStore } from '../lib/stores/backendUserStore';

interface TrendingTopic {
    id: string;
    topic: string;
    tweets_count: number;
    category?: string;
}

interface SuggestedUser {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified: boolean;
    bio?: string;
    followers_count: number;
}

export function RightSidebar() {
    const { user } = useBackendUserStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);

    useEffect(() => {
        // Mock data - in a real app, this would come from the API
        setTrendingTopics([
            { id: '1', topic: '#Rust', tweets_count: 12500, category: 'Technology' },
            { id: '2', topic: '#WebDev', tweets_count: 8900, category: 'Technology' },
            { id: '3', topic: '#AI', tweets_count: 15600, category: 'Technology' },
            { id: '4', topic: '#JavaScript', tweets_count: 22000, category: 'Technology' },
            { id: '5', topic: '#TypeScript', tweets_count: 9800, category: 'Technology' },
        ]);

        setSuggestedUsers([
            {
                id: '1',
                username: 'rustlang',
                display_name: 'Rust Language',
                is_verified: true,
                bio: 'A language empowering everyone to build reliable and efficient software.',
                followers_count: 125000,
            },
            {
                id: '2',
                username: 'vercel',
                display_name: 'Vercel',
                is_verified: true,
                bio: 'The platform for frontend developers. Deploy instantly, scale automatically.',
                followers_count: 89000,
            },
            {
                id: '3',
                username: 'nextjs',
                display_name: 'Next.js',
                is_verified: true,
                bio: 'The React Framework for Production',
                followers_count: 156000,
            },
        ]);
    }, []);

    return (
        <div className="p-4 space-y-6">
            {/* Search */}
            <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">🔍</span>
                <input
                    type="text"
                    placeholder="Search Twitter"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-full py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Your Assets */}
            {user && (
                <div className="mt-4">
                    <AssetsPanel userId={user._id?.$oid} maxDisplay={2} />
                </div>
            )}

            {/* What's happening */}
            <div className="bg-gray-800 rounded-2xl">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">What's happening</h2>
                </div>
                <div className="divide-y divide-gray-700">
                    {trendingTopics.map((topic, index) => (
                        <div key={topic.id} className="p-4 hover:bg-gray-700 cursor-pointer transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500">
                                        {topic.category} · Trending
                                    </p>
                                    <p className="text-white font-bold hover:underline">
                                        {topic.topic}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {topic.tweets_count.toLocaleString()} Tweets
                                    </p>
                                </div>
                                <button className="text-gray-500 hover:text-white">
                                    <span className="text-lg">⋯</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4">
                    <button className="text-blue-500 hover:text-blue-400 text-sm">
                        Show more
                    </button>
                </div>
            </div>

            {/* Who to follow */}
            <div className="bg-gray-800 rounded-2xl">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Who to follow</h2>
                </div>
                <div className="divide-y divide-gray-700">
                    {suggestedUsers.map((user) => (
                        <div key={user.id} className="p-4 hover:bg-gray-700 transition-colors">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-600 rounded-full flex-shrink-0 flex items-center justify-center">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.display_name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-white text-sm font-medium">
                                            {user.display_name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1">
                                        <p className="text-white font-bold truncate">
                                            {user.display_name}
                                        </p>
                                        {user.is_verified && (
                                            <span className="text-blue-500">✓</span>
                                        )}
                                    </div>
                                    <p className="text-gray-500 text-sm truncate">
                                        @{user.username}
                                    </p>
                                    {user.bio && (
                                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>
                                <button className="bg-white text-black font-bold py-1.5 px-4 rounded-full hover:bg-gray-200 transition-colors text-sm">
                                    Follow
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4">
                    <button className="text-blue-500 hover:text-blue-400 text-sm">
                        Show more
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-500 space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <a href="#" className="hover:underline">Terms of Service</a>
                    <a href="#" className="hover:underline">Privacy Policy</a>
                    <a href="#" className="hover:underline">Cookie Policy</a>
                    <a href="#" className="hover:underline">Accessibility</a>
                    <a href="#" className="hover:underline">Ads info</a>
                    <a href="#" className="hover:underline">More</a>
                </div>
                <p>© 2024 Evil Twitter, Inc.</p>
            </div>
        </div>
    );
}