// A button to test the ping endpoint

import React, { useState } from 'react';
import { useTweetsStore } from '../lib/stores/tweetsStore';

export function TestPing() {
    const [testCount, setTestCount] = useState(0);
    const { ping, ping_result } = useTweetsStore();
    const handlePing = async () => {
        setTestCount(prev => prev + 1);
        await ping();
    };
    return (
        <div>
            <button onClick={handlePing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">Test Ping</button>
            <div>{ping_result}</div>
            <div>Test Count: {testCount}</div>
        </div>);
}