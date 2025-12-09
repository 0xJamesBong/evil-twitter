"use client";

import { useState, useCallback } from "react";
import { IconButton, CircularProgress, Tooltip } from "@mui/material";
import { AttachMoney as TipIcon } from "@mui/icons-material";
import { useTip } from "@/hooks/useTip";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useIdentityToken } from "@privy-io/react-auth";

const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";

interface TipButtonProps {
    recipientUserId?: string; // Required when postId is not provided
    postId?: string | null; // When provided, backend will use post creator as recipient
    size?: "small" | "medium";
    variant?: "icon" | "button";
}

export function TipButton({ recipientUserId, postId, size = "small", variant = "icon" }: TipButtonProps) {
    const { tip, loading } = useTip();
    const { user } = useBackendUserStore();
    const { identityToken } = useIdentityToken();
    const [isPending, setIsPending] = useState(false);

    // Get default payment token (defaults to BLING)
    const defaultTokenMint = user?.defaultPaymentToken || BLING_MINT;
    const defaultAmount = 1; // Default tip amount is 1

    const handleTip = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!identityToken) {
            return;
        }

        setIsPending(true);

        try {
            // Call tip mutation - backend will handle batching/flushing
            // If postId is provided, don't pass recipientUserId (backend will use post creator)
            // If postId is not provided, recipientUserId is required
            if (!postId && !recipientUserId) {
                throw new Error("recipientUserId is required when postId is not provided");
            }

            await tip(
                postId ? null : recipientUserId!,
                defaultAmount,
                defaultTokenMint || null,
                postId || null
            );
        } catch (error) {
            console.error("Failed to tip:", error);
        } finally {
            // Clear pending state after a short delay
            setTimeout(() => setIsPending(false), 300);
        }
    }, [recipientUserId, postId, defaultTokenMint, tip, identityToken]);

    const isLoading = loading || isPending;

    if (variant === "button") {
        return (
            <Tooltip title={`Tip ${defaultAmount} ${defaultTokenMint === BLING_MINT ? 'BLING' : 'token'}`}>
                <IconButton
                    size={size}
                    onClick={handleTip}
                    disabled={isLoading || !identityToken}
                    sx={{
                        color: "text.secondary",
                        "&:hover": {
                            bgcolor: "rgba(255,193,7,0.15)",
                            color: "warning.main"
                        },
                    }}
                >
                    {isLoading ? (
                        <CircularProgress size={size === "small" ? 16 : 20} />
                    ) : (
                        <TipIcon fontSize={size} />
                    )}
                </IconButton>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={`Tip ${defaultAmount} ${defaultTokenMint === BLING_MINT ? 'BLING' : 'token'}`}>
            <IconButton
                size={size}
                onClick={handleTip}
                disabled={isLoading || !identityToken}
                className="tip-icon"
                sx={{
                    color: "text.secondary",
                    "&:hover": {
                        bgcolor: "rgba(255,193,7,0.15)",
                        color: "warning.main"
                    },
                }}
            >
                {isLoading ? (
                    <CircularProgress size={size === "small" ? 16 : 20} />
                ) : (
                    <TipIcon fontSize={size} />
                )}
            </IconButton>
        </Tooltip>
    );
}

