'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../components/UserProfile';
import { UserStats } from '../../components/UserStats';
import { ApiTest } from '../../components/ApiTest';
import { ImageGallery } from '../../components/ImageGallery';
import { AuthModal } from '../../components/AuthModal';
import { useAuthStore } from '../../lib/stores/authStore';

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, refreshSession } = useAuthStore();

  useEffect(() => {
    // Check for existing session on page load
    refreshSession();
  }, [refreshSession]);

  const handleLogin = () => {
    setShowAuthModal(false);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-white text-2xl font-bold">Image Remix</h1>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-purple-500 px-4 py-2 rounded-lg text-white hover:bg-purple-600 transition-colors"
            >
              {isAuthenticated ? 'Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <UserProfile />
            <UserStats />
            <ApiTest />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <ImageGallery />
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleLogin}
        />
      )}
    </div>
  );
}
