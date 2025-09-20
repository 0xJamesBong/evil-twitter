'use client';

import React from 'react';
import Navbar from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { Timeline } from '../../components/Timeline';
import { RightSidebar } from '../../components/RightSidebar';
import { useAuthStore } from '../../lib/stores/authStore';

export default function HomePage() {
  const { isAuthenticated, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto flex pt-16">
        {/* Left Sidebar */}
        <div className="w-64 fixed left-0 top-16 h-full border-r border-gray-800">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 mr-80">
          <Timeline />
        </div>

        {/* Right Sidebar */}
        <div className="w-80 fixed right-0 top-16 h-full border-l border-gray-800">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
