"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { onboardUser } from "@/lib/api/backend";

export function OnboardingHandler() {
    const { authenticated, getAccessToken, user } = usePrivy();
    const [onboardingStatus, setOnboardingStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleOnboarding = async () => {
            if (!authenticated || onboardingStatus !== "idle") {
                return;
            }

            setOnboardingStatus("loading");

            try {
                const token = await getAccessToken();
                if (!token) {
                    throw new Error("Failed to get access token");
                }

                // Get user's handle and display name from Privy user
                // For now, we'll generate a default handle from email or wallet
                let handle = "";
                let displayName = "";

                if (user?.email?.address) {
                    handle = user.email.address.split("@")[0];
                    displayName = user.email.address.split("@")[0];
                } else if (user?.wallet?.address) {
                    handle = `user_${user.wallet.address.slice(0, 8)}`;
                    displayName = "User";
                } else {
                    handle = `user_${Date.now()}`;
                    displayName = "User";
                }

                await onboardUser(token, { handle, displayName });
                setOnboardingStatus("success");
            } catch (err) {
                console.error("Onboarding error:", err);
                setError(err instanceof Error ? err.message : "Failed to onboard user");
                setOnboardingStatus("error");
            }
        };

        handleOnboarding();
    }, [authenticated, getAccessToken, user, onboardingStatus]);

    if (onboardingStatus === "loading") {
        return (
            <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded">
                Setting up your account...
            </div>
        );
    }

    if (onboardingStatus === "error") {
        return (
            <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded">
                {error || "Failed to set up account"}
            </div>
        );
    }

    return null;
}

