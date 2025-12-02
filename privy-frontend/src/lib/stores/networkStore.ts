// src/stores/networkStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Network = "localnet" | "devnet" | "mainnet";

interface NetworkStore {
  network: Network;
  setNetwork: (network: Network) => void;
}

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set) => ({
      network: "localnet", // default
      setNetwork: (network) => set({ network }),
    }),
    { name: "solana-network" } // stored in localStorage
  )
);
