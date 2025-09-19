'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../lib/stores/authStore';
import { AuthModal } from './AuthModal';

export default function Navbar() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { isAuthenticated, refreshSession } = useAuthStore();

    const handleLogin = () => {
        setShowAuthModal(false);
    };

    return (
        <>
            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={handleLogin}
                />
            )}
        </>
    );
} 