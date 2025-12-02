import { useNetworkStore } from "./stores/networkStore";

/**
 * Get the backend URL based on the current network selection.
 * Each backend instance is bound to one Solana network.
 */
export function getBackendUrl(): string {
  const network = useNetworkStore.getState().network;
  if (network === "devnet") {
    return (
      process.env.NEXT_PUBLIC_BACKEND_URL_DEV ||
      "https://dev-api.evil-twitter.com"
    );
  }
  // Default to localnet
  return process.env.NEXT_PUBLIC_BACKEND_URL_LOCAL || "http://localhost:3001";
}
