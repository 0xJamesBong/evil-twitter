import { Profile } from '@/components/Profile';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function UserProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();

    return (
        <Profile
            userId={userId}
            isOwnProfile={false}
            showBackButton={true}
            headerTitle="Profile"
        />
    );
}

