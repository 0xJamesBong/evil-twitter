import React from 'react';
import { Tweet } from '@/lib/stores/tweetsStore';
import { TweetComponent } from './TweetComponent';

interface TweetCardProps {
    tweet: Tweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
    return (
        <TweetComponent
            tweet={tweet}
            isClickable={true}
        />
    );
}
