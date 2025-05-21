// src/providers/redemption-store-provider.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/* eslint-disable @typescript-eslint/no-unused-expressions */

"use client";

import { useRef, useEffect, createContext, ReactNode, useContext } from "react";
import { useStore } from "zustand";

import { createAuthStore, AuthStore } from "./authStore";


// Define the Provider Props
export interface StoreProviderProps {
  children: ReactNode;
}

// Redemption Store API Type - this is the type of the store instance that will be provided to the context.
export type AuthStoreApi = ReturnType<typeof createAuthStore>;

export interface CombinedStores {
  authStore: AuthStoreApi;
}


// Context for Combined Store
export const StoreContext = createContext<CombinedStores | undefined>(
  undefined,
);

// Store Provider

export const StoreProvider = ({ children }: StoreProviderProps) => {
  // useRef ensures that the store instances are created only once and persist across re-renders.
  const authStoreRef = useRef<AuthStoreApi>();

  if (!authStoreRef.current) {
    // Create the auth store and store it in the ref.
    authStoreRef.current = createAuthStore();
  }



  return (
    // Provide the initialized store instances to the context.
    <StoreContext.Provider
      value={{
        authStore: authStoreRef.current,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

// Hook for using the store
export const useAuthStore = <T,>(
  selector: (store: AuthStore) => T,
): T => {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useAuthStore must be used within StoreProvider");
  }

  return useStore(context.authStore, selector);
};

