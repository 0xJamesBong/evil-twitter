"use client";

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { getConnection } from "./connection";
import {
    ConnectedStandardSolanaWallet,
    useWallets,
} from "@privy-io/react-auth/solana";
import React, { useMemo, createContext, useContext } from "react";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./program";
import idl from "./idl/opinions_market.json";

type SolanaProgramContextType = {
    connection: ReturnType<typeof getConnection>;
    getProgramForWallet: (wallet: ConnectedStandardSolanaWallet) => Program;
};

export const SolanaProgramContext =
    createContext<SolanaProgramContextType | null>(null);

export const SolanaProgramProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { wallets } = useWallets();
    const connection = getConnection();

    const getProgramForWallet = useMemo(() => {
        return (wallet: ConnectedStandardSolanaWallet) => {
            const provider = new AnchorProvider(
                connection,
                {
                    publicKey: new PublicKey(wallet.address),
                    signTransaction: async (tx: any) => tx,
                    signAllTransactions: async (txs: any[]) => txs,
                } as any,
                { commitment: "confirmed" }
            );

            return new Program(idl as any, PROGRAM_ID as any, provider as any);
        };
    }, [connection]);

    return (
        <SolanaProgramContext.Provider value={{ connection, getProgramForWallet }}>
            {children}
        </SolanaProgramContext.Provider>
    );
};

export const useSolanaProgram = () => {
    const ctx = useContext(SolanaProgramContext);
    if (!ctx) throw new Error("useSolanaProgram must be used inside provider");
    return ctx;
};
