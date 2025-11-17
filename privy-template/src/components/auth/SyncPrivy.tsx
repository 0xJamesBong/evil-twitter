"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

export function SyncPrivy() {
    const { authenticated, getAccessToken, user } = usePrivy();
    const { onboardUser, fetchMe, isLoading, error } = useBackendUserStore();
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
        "idle"
    );

    useEffect(() => {
        const run = async () => {
            if (!authenticated || status !== "idle") return;

            setStatus("loading");
            try {
                const token = await getAccessToken();
                if (!token) throw new Error("Missing access token");

                // 1) Derive handle/display_name (for first-time users)
                let handle = "";
                let displayName = "";

                if (user?.email?.address) {
                    const prefix = user.email.address.split("@")[0];
                    handle = prefix;
                    displayName = prefix;
                } else if ((user as any)?.wallet?.address) {
                    const addr = (user as any).wallet.address as string;
                    handle = `user_${addr.slice(0, 8)}`;
                    displayName = "User";
                } else {
                    handle = `user_${Date.now()}`;
                    displayName = "User";
                }

                // 2) Call store method - handles GraphQL internally
                await onboardUser(token, handle, displayName);

                // 3) Fetch "me" from backend - store method handles GraphQL
                await fetchMe(token);

                setStatus("done");
            } catch (e) {
                console.error("Session bootstrap error:", e);
                setStatus("error");
            }
        };

        run();
    }, [authenticated, getAccessToken, status, user, onboardUser, fetchMe]);

    // Use store's loading/error state
    const displayLoading = isLoading || status === "loading";
    const displayError = error || status === "error";

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