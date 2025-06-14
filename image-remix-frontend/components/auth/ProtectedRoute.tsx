import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inProtectedGroup = segments[0] === '(protected)';

        if (!isAuthenticated && inProtectedGroup) {
            // Redirect to the sign-in page if not authenticated
            router.replace('/');
        } else if (isAuthenticated && inAuthGroup) {
            // Redirect to the home page if already authenticated
            router.replace('/');
        }
    }, [isAuthenticated, segments, isLoading]);

    if (isLoading) {
        // You might want to show a loading spinner here
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute; 