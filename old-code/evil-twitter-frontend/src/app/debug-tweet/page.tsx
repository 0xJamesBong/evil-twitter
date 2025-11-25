'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useTweetsStore } from '../../../lib/stores/tweetsStore';
import { useComposeStore } from '../../../lib/stores/composeStore';

export default function DebugTweetPage() {
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const { session, isAuthenticated } = useAuthStore();
    const { tweets, fetchTweets, createTweet, generateFakeTweets } = useTweetsStore();
    const { content, setContent, submitTweet } = useComposeStore();

    const testTweet = async () => {
        setLoading(true);
        setResult('Testing tweet creation using store...\n');

        try {
            setResult(prev => prev + 'Using Zustand store to create tweet\n');
            const result = await createTweet('Test tweet from debug page using store');

            if (result.success) {
                setResult(prev => prev + '✅ Tweet created successfully using store!\n');
                setResult(prev => prev + `Tweet: ${JSON.stringify(result.tweet, null, 2)}\n`);
            } else {
                setResult(prev => prev + `❌ Tweet creation failed: ${result.error}\n`);
            }
        } catch (error) {
            setResult(prev => prev + `❌ Error: ${error}\n`);
        } finally {
            setLoading(false);
        }
    };

    const testFetchTweets = async () => {
        setLoading(true);
        setResult('Testing tweet fetching using store...\n');

        try {
            setResult(prev => prev + 'Using Zustand store to fetch tweets\n');
            await fetchTweets();
            setResult(prev => prev + `Fetched ${tweets.length} tweets using store\n`);
            setResult(prev => prev + `Tweets: ${JSON.stringify(tweets, null, 2)}\n`);
        } catch (error) {
            setResult(prev => prev + `❌ Error fetching tweets: ${error}\n`);
        } finally {
            setLoading(false);
        }
    };

    const testComposeStore = () => {
        setResult(prev => prev + 'Testing compose store...\n');
        setContent('Test content from debug page');
        setResult(prev => prev + `Set content to: ${content}\n`);
    };

    const testFakeTweets = async () => {
        setLoading(true);
        setResult('Testing fake tweets generation...\n');

        try {
            setResult(prev => prev + 'Using Zustand store to generate fake tweets\n');
            const result = await generateFakeTweets();

            if (result.success) {
                setResult(prev => prev + '✅ Fake tweets generated successfully!\n');
                setResult(prev => prev + `Generated ${tweets.length} fake tweets\n`);
            } else {
                setResult(prev => prev + `❌ Fake tweets generation failed: ${result.error}\n`);
            }
        } catch (error) {
            setResult(prev => prev + `❌ Error: ${error}\n`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <h1 className="text-3xl font-bold mb-8">Debug Tweet Page</h1>

            <div className="space-y-4 mb-8">
                <div>
                    <strong>Auth Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
                </div>
                <div>
                    <strong>Session:</strong> {session ? 'Available' : 'Not available'}
                </div>
                <div>
                    <strong>Access Token:</strong> {session?.access_token ? 'Available' : 'Not available'}
                </div>
            </div>

            <div className="space-x-4 mb-8">
                <button
                    onClick={testTweet}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Test Create Tweet (Store)'}
                </button>

                <button
                    onClick={testFetchTweets}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Test Fetch Tweets (Store)'}
                </button>

                <button
                    onClick={testComposeStore}
                    className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded"
                >
                    Test Compose Store
                </button>

                <button
                    onClick={testFakeTweets}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded disabled:opacity-50"
                >
                    {loading ? 'Generating...' : 'Generate Fake Tweets'}
                </button>
            </div>

            <div className="bg-gray-800 p-4 rounded">
                <h2 className="text-xl font-bold mb-4">Debug Output:</h2>
                <pre className="whitespace-pre-wrap text-sm">{result || 'Click a test button to see results'}</pre>
            </div>
        </div>
    );
}
