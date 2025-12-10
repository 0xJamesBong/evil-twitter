"use client";

import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { AttachMoney as TipIcon } from "@mui/icons-material";
import { useTweetStore } from "@/lib/stores/tweetStore";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useIdentityToken } from "@privy-io/react-auth";
import { useSnackbar } from "notistack";

const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";

interface TipButtonProps {
    recipientUserId?: string; // Required when postId is not provided
    postId?: string | null; // When provided, backend will use post creator as recipient
    size?: "small" | "medium";
    variant?: "icon" | "button";
}

export function TipButton({ recipientUserId, postId, size = "small", variant = "icon" }: TipButtonProps) {
    const { tipOnTweet } = useTweetStore();
    const { user } = useBackendUserStore();
    const { identityToken } = useIdentityToken();
    const { enqueueSnackbar } = useSnackbar();
    const [tipAnimation, setTipAnimation] = useState(false);

    // Get default payment token (defaults to BLING)
    const defaultTokenMint = user?.defaultPaymentToken || BLING_MINT;
    const defaultAmount = 1; // Default tip amount is 1
    const tokenName = defaultTokenMint === BLING_MINT ? "BLING" : "tokens";

    const handleTip = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!identityToken) {
            enqueueSnackbar("Please log in to tip", { variant: "error" });
            return;
        }

        if (!postId && !recipientUserId) {
            enqueueSnackbar("Cannot tip: missing recipient or post", { variant: "error" });
            return;
        }

        // Trigger animation immediately (visual feedback only)
        setTipAnimation(true);
        setTimeout(() => setTipAnimation(false), 600);

        // Show toast notification
        enqueueSnackbar(`Tipped ${defaultAmount} ${tokenName}!`, {
            variant: "success",
            autoHideDuration: 2000,
        });

        // Fire-and-forget: send tip to backend (no await, no error handling)
        // Backend will batch and process tips, and frontend will refresh from on-chain
        if (postId) {
            tipOnTweet(identityToken, postId, defaultAmount, defaultTokenMint || undefined).catch((error) => {
                // Silently log errors - backend handles retries and state sync
                console.error("Tip submission error (will be retried by backend):", error);
            });
        } else {
            // For non-post tips, we'd need a different function or keep useTip
            // For now, only support post tips
            console.warn("Direct user tips not yet supported via tweet store");
        }
    };

    const button = (
        <IconButton
            size={size}
            onClick={handleTip}
            disabled={!identityToken || !postId}
            className="tip-icon"
            sx={{
                color: "text.secondary",
                transform: tipAnimation ? "scale(1.1)" : "scale(1)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: tipAnimation
                    ? "0 0 20px rgba(255,193,7,0.6), 0 4px 8px rgba(0, 0, 0, 0.2)"
                    : undefined,
                "&:hover": {
                    bgcolor: "rgba(255,193,7,0.15)",
                    color: "warning.main",
                    transform: "scale(1.05)",
                },
                "&:active": {
                    transform: "scale(0.95)",
                },
                "&:disabled": {
                    opacity: 0.5,
                    cursor: "not-allowed",
                },
            }}
        >
            <TipIcon fontSize={size} />
        </IconButton>
    );

    return (
        <Tooltip title={`Tip ${defaultAmount} ${tokenName}`}>
            {button}
        </Tooltip>
    );
}

