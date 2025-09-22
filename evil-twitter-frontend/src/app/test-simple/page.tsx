'use client';

import React, { useEffect, useState } from 'react';

export default function TestSimplePage() {
    const [tweets, setTweets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTweets = async () => {
            try {
                console.log('Fetching tweets...');
                const response = await fetch('http://localhost:3000/tweets');
                console.log('Response status:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log('Tweets data:', data);
                setTweets(data.tweets || []);
                setLoading(false);
            } catch (err) {
                console.error('Error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        fetchTweets();
    }, []);

    if (loading) {
        return <div className="p-8 text-white">Loading tweets...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">Simple Tweet Test</h1>
            <p className="mb-4">Found {tweets.length} tweets</p>
            <div className="space-y-4">
                {tweets.slice(0, 3).map((tweet, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                        <p><strong>Content:</strong> {tweet.content}</p>
                        <p><strong>Author:</strong> {tweet.author_display_name}</p>
                        <p><strong>Health:</strong> {tweet.health}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
