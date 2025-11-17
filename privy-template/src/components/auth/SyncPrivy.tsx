"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

export function SyncPrivy() {
    const { authenticated, getAccessToken, user } = usePrivy();
    const backendUser = useBackendUserStore((state) => state.user);
    const isLoading = useBackendUserStore((state) => state.isLoading);
    const error = useBackendUserStore((state) => state.error);

    const hasAttemptedRef = useRef(false);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        const run = async () => {
            // Get store functions directly to avoid dependency issues
            const { onboardUser, fetchMe } = useBackendUserStore.getState();

            // Reset when not authenticated
            if (!authenticated) {
                hasAttemptedRef.current = false;
                isProcessingRef.current = false;
                return;
            }

            // Don't run if already processing
            if (isProcessingRef.current) {
                return;
            }

            // If we already attempted and user exists, we're done
            if (hasAttemptedRef.current && backendUser) {
                return;
            }

            // If we attempted but no user, allow retry
            if (hasAttemptedRef.current && !backendUser) {
                hasAttemptedRef.current = false;
            }

            if (hasAttemptedRef.current) {
                return;
            }

            hasAttemptedRef.current = true;
            isProcessingRef.current = true;

            try {
                const token = await getAccessToken();
                if (!token) {
                    console.error("SyncPrivy: Missing access token");
                    hasAttemptedRef.current = false;
                    isProcessingRef.current = false;
                    return;
                }

                console.log("SyncPrivy: Starting sync process...");

                // First, try to fetch existing user
                try {
                    await fetchMe(token);
                    const currentUser = useBackendUserStore.getState().user;
                    console.log("SyncPrivy: User already exists in backend", currentUser);
                    isProcessingRef.current = false;
                    return; // User exists, we're done
                } catch (fetchError: any) {
                    // User doesn't exist, need to onboard
                    console.log("SyncPrivy: User not found, will onboard. Error:", fetchError?.message);
                }

                // Derive handle/display_name from Privy user
                let handle = "";
                let displayName = "";

                // Get Solana wallet address from Privy user
                // Privy user object structure may vary, so we use type assertion
                const privyUserAny = user as any;
                const solanaWallet = privyUserAny?.wallets?.find(
                    (w: any) => w.chainType === "solana" || w.chain_type === "solana"
                ) || privyUserAny?.wallet;

                if (user?.email?.address) {
                    const prefix = user.email.address.split("@")[0];
                    handle = prefix;
                    displayName = prefix;
                } else if (solanaWallet?.address) {
                    const addr = solanaWallet.address as string;
                    handle = `user_${addr.slice(0, 8)}`;
                    displayName = "User";
                } else {
                    handle = `user_${Date.now()}`;
                    displayName = "User";
                }

                console.log("SyncPrivy: Onboarding user with handle:", handle, "displayName:", displayName);

                // Onboard new user
                await onboardUser(token, handle, displayName);
                console.log("SyncPrivy: Onboarding successful");

                // Fetch the newly created user
                await fetchMe(token);
                console.log("SyncPrivy: User profile fetched successfully");
            } catch (e: any) {
                console.error("SyncPrivy error:", e);
                hasAttemptedRef.current = false; // Allow retry on error
            } finally {
                isProcessingRef.current = false;
            }
        };

        run();
    }, [authenticated, user, backendUser, getAccessToken]);

    // Use store's loading/error state
    const displayLoading = isLoading;
    const displayError = error;

    if (displayLoading) {
        return (
            <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded z-50">
                Connecting your account…
            </div>
        );
    }

    if (displayError) {
        return (
            <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded z-50">
                {error || "Failed to connect account"}
            </div>
        );
    }

    return null;
}