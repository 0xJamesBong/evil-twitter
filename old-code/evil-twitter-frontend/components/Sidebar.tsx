'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '../lib/stores/authStore';

export function Sidebar() {
    const { user, isAuthenticated } = useAuthStore();

    const navigation = [
        { name: 'Home', href: '/', icon: '🏠' },
        { name: 'Explore', href: '/explore', icon: '🔍' },
        { name: 'Notifications', href: '/notifications', icon: '🔔' },
        { name: 'Messages', href: '/messages', icon: '✉️' },
        { name: 'Bookmarks', href: '/bookmarks', icon: '🔖' },
        { name: 'Profile', href: isAuthenticated ? '/profile' : '/login', icon: '👤' },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4">
                <Link href="/" className="text-2xl font-bold text-white">
                    Evil Twitter
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2">
                {navigation.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-4 px-4 py-3 rounded-full hover:bg-gray-800 transition-colors"
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-lg">{item.name}</span>
                    </Link>
                ))}
            </nav>

            {/* Tweet Button */}
            <div className="p-4">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full transition-colors">
                    Tweet
                </button>
            </div>

            {/* User Profile */}
            {isAuthenticated && user ? (
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-xl">👤</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user.user_metadata?.display_name || user.email}
                            </p>
                            <p className="text-sm text-gray-400 truncate">
                                @{user.user_metadata?.username || 'user'}
                            </p>
                        </div>
                        <span className="text-gray-400">⋯</span>
                    </div>
                </div>
            ) : (
                <div className="p-4 border-t border-gray-800">
                    <div className="text-center text-gray-400 text-sm">
                        Please log in to access all features
                    </div>
                </div>
            )}
        </div>
    );
}