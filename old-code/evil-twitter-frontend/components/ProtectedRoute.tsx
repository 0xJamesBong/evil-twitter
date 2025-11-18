'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/stores/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    redirectTo = '/login'
}: ProtectedRouteProps) {
    const { isAuthenticated, initialized, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (initialized && !isAuthenticated && !isLoading) {
            router.push(redirectTo);
        }
    }, [isAuthenticated, initialized, isLoading, router, redirectTo]);

    if (!initialized || isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">Redirecting...</div>
            </div>
        );
    }

    return <>{children}</>;
}
