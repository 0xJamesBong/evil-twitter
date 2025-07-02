'use client';

import React, { useEffect } from 'react';
import { UserProfile } from '../../components/UserProfile';
import { UserStats } from '../../components/UserStats';
import { ApiTest } from '../../components/ApiTest';
import { ImageGallery } from '../../components/ImageGallery';
import { ImageRemixer } from '../../components/ImageRemixer';
import { DummyImageDisplay } from '../../components/DummyImageDisplay';
import { useAuthStore } from '../../lib/stores/authStore';

export default function HomePage() {
  const { refreshSession } = useAuthStore();

  useEffect(() => {
    // Check for existing session on page load
    refreshSession();
  }, [refreshSession]);

  return (
    <div className="min-h-screen bg-black">
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
          <div className="lg:col-span-3 space-y-8">
            <ImageRemixer />
            <DummyImageDisplay />
            <ImageGallery />
          </div>
        </div>
      </main>
    </div>
  );
}
