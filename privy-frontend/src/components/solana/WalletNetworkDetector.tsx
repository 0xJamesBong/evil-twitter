"use client";

import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { Wallet } from "@privy-io/react-auth";

const identifyNetwork = (endpoint: string) => {
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) return "localnet";
    if (endpoint.includes("devnet")) return "devnet";
    if (endpoint.includes("testnet")) return "testnet";
    if (endpoint.includes("mainnet")) return "mainnet";
    return "unknown";
};

export default function WalletNetworkDetector(wallet: Wallet) {

    const [network, setNetwork] = useState<string>("no wallet");

    async function connectWallet() {

        const provider = window.solana;
        if (!provider) return;

        const res = await provider.connect();
        console.log("chainType", wallet.chainType);

        // provider.connection is injected by Phantom
        const endpoint = provider.connection.rpcEndpoint;
        const detected = identifyNetwork(endpoint);
        setNetwork(detected);
    }

    return (
        <div className="flex items-center gap-2 text-sm text-gray-200">
            {wallet.chainType ? (
                <span>Network: {network}</span>
            ) : (
                <button
                    onClick={connectWallet}
                    className="px-2 py-1 border border-gray-400 rounded"
                >
                    Connect Wallet
                </button>
            )}
        </div>
    );
}
