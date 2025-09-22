'use client';

import React, { useEffect, useState } from 'react';

export default function TestApiPage() {
    const [tweets, setTweets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const testApi = async () => {
            try {
                console.log('Testing API calls...');

                // Test ping endpoint first
                const pingResponse = await fetch('http://localhost:3000/ping');
                console.log('Ping response status:', pingResponse.status);

                if (!pingResponse.ok) {
                    throw new Error(`Ping API failed: ${pingResponse.status}`);
                }

                const pingData = await pingResponse.json();
                console.log('Ping data:', pingData);

                // Test general tweets endpoint
                const tweetsResponse = await fetch('http://localhost:3000/tweets');
                console.log('Tweets response status:', tweetsResponse.status);

                if (!tweetsResponse.ok) {
                    throw new Error(`Tweets API failed: ${tweetsResponse.status}`);
                }

                const tweetsData = await tweetsResponse.json();
                console.log('Tweets data:', tweetsData);
                setTweets(tweetsData.tweets || []);

                setLoading(false);
            } catch (err) {
                console.error('API test error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        // Add a small delay to ensure the component is mounted
        setTimeout(testApi, 100);
    }, []);

    if (loading) {
        return <div className="p-8 text-white">Testing API calls...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">API Test Results</h1>
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Tweets ({tweets.length})</h2>
                <div className="space-y-2">
                    {tweets.slice(0, 5).map((tweet, index) => (
                        <div key={index} className="p-2 bg-gray-800 rounded">
                            <p><strong>Content:</strong> {tweet.content}</p>
                            <p><strong>Author:</strong> {tweet.author_display_name}</p>
                            <p><strong>Health:</strong> {tweet.health}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
