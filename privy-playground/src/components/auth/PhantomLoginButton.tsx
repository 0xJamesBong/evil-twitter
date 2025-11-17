"use client";

import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import { useCallback } from "react";

export function PhantomLoginButton() {
    const { login, authenticated } = usePrivy();
    const { connectWallet } = useSolanaWallets();

    const handlePhantomLogin = useCallback(async () => {
        try {
            // First, connect Phantom wallet
            await connectWallet({ walletList: ["phantom"] });

            // Then authenticate with the connected wallet
            if (!authenticated) {
                await login();
            }
        } catch (error) {
            console.error("Failed to connect Phantom:", error);
        }
    }, [connectWallet, login, authenticated]);

    return (
        <button
            className="bg-white text-brand-off-black w-full max-w-md rounded-full px-4 py-2 hover:bg-gray-100 lg:px-8 lg:py-4 lg:text-xl mt-4"
            onClick={handlePhantomLogin}
        >
            Continue with Phantom
        </button>
    );
}

