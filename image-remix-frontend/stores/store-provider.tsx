// src/providers/redemption-store-provider.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/* eslint-disable @typescript-eslint/no-unused-expressions */

"use client";

import React, { createContext, useContext, useRef } from 'react';
import { useAuthStore } from './authStore';

interface StoreContextValue {
  authStore: ReturnType<typeof useAuthStore>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const authStore = useAuthStore;

  return (
    <StoreContext.Provider
      value={{
        authStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

