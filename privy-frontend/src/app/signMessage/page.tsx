"use client";

import { useState } from "react";
import { useWallets, useSignMessage } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { usePrivy } from "@privy-io/react-auth";
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Alert,
    CircularProgress,
    Paper,
    Stack,
} from "@mui/material";
import { ArrowBack as ArrowLeftIcon } from "@mui/icons-material";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { LoginPrompt } from "@/components/auth/LoginPrompt";

import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { API_BASE_URL } from "@/lib/config";

export const SignMessageButton = () => {
    const { wallets } = useWallets();
    const { signMessage } = useSignMessage();
    const [signature, setSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSign = async () => {
        try {
            setLoading(true);

            const selectedWallet = wallets[0];
            if (!selectedWallet) throw new Error("No wallet connected");

            const message = "Hello world";
            const messageBytes = new TextEncoder().encode(message);

            const result = await signMessage({
                message: messageBytes,
                wallet: selectedWallet,
                options: {
                    uiOptions: { title: "Sign this message" },
                },
            });

            const signatureBase58 = bs58.encode(result.signature);
            setSignature(signatureBase58);

            await fetch(`${API_BASE_URL}/api/session/delegate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet: selectedWallet.address,
                    signature: signatureBase58,
                    session_pubkey: "placeholder",
                    expires: Math.floor(Date.now() / 1000) + 86400,
                    message,
                }),
            });

            console.log("Signature sent to backend:", signatureBase58);
        } catch (err) {
            console.error("Failed to sign message:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSign}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
            {loading ? "Signing..." : "Sign Message"}
        </button>
    );
};




function SignMessageContent() {
    const { ready, authenticated, logout, user: privyUser } = usePrivy();
    const { user: backendUser, isLoading, error } = useBackendUserStore();


    console.log("Test, backendUser:", backendUser);
    console.log("Test, privyUser:", privyUser);
    console.log("API_BASE_URL: ", API_BASE_URL);

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated) {
        return <LoginPrompt />;
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                height: { md: "calc(100vh - 60px)" },
            }}
        >
            <SignMessageButton />
        </Box>
    );
}

export default function SignMessage() {
    return <SignMessageContent />;
}

