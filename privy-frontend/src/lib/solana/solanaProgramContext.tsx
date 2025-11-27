"use client";
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { getConnection } from "./connection";
import {
    ConnectedStandardSolanaWallet,
    useWallets,
} from "@privy-io/react-auth/solana";
import React, { useMemo, createContext, useContext } from "react";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./program";
import OpinionsMarketIdl from "./idl/opinions_market.json";
import { OpinionsMarket as OpinionsMarketType } from "./types/opinions_market";




// PDA seeds matching the program
const CONFIG_SEED = Buffer.from("config");
const VALID_PAYMENT_SEED = Buffer.from("valid_payment");
const USER_ACCOUNT_SEED = Buffer.from("user_account");
const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");
const USER_VAULT_TOKEN_ACCOUNT_SEED = Buffer.from("user_vault_token_account");
const POST_ACCOUNT_SEED = Buffer.from("post_account");
const POSITION_SEED = Buffer.from("position");
const POST_POT_AUTHORITY_SEED = Buffer.from("post_pot_authority");
const POST_POT_TOKEN_ACCOUNT_SEED = Buffer.from("post_pot_token_account");
const PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED = Buffer.from(
    "protocol_treasury_token_account"
);
const POST_MINT_PAYOUT_SEED = Buffer.from("post_mint_payout");
const USER_POST_MINT_CLAIM_SEED = Buffer.from("user_post_mint_claim");


import { Connection, Keypair } from "@solana/web3.js";

export class Common {
    connection: Connection;
    provider: anchor.AnchorProvider;
    fundingWallet: anchor.Wallet; // this cannot be deleted because it is used for the anchorProvider
    // Define the genesis hashes as constants
    readonly TESTNET_GENESIS_HASH =
        "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY"; // Testnet genesis hash
    readonly DEVNET_GENESIS_HASH =
        "EtWTRABZaYqkW7QKBY59fHz9rGh5L7oAcyt8o3MiMJie"; // Devnet genesis hash
    readonly MAINNET_GENESIS_HASH =
        "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

    constructor(connection: anchor.web3.Connection, fundingWalletKP: Keypair) {
        this.connection = connection;
        this.fundingWallet = new anchor.Wallet(fundingWalletKP);
        this.provider = new anchor.AnchorProvider(
            this.connection,
            this.fundingWallet,
            {}
        );
        anchor.setProvider(this.provider);
    }

    async checkCluster(connection: Connection): Promise<string> {
        const genesisHash = await connection.getGenesisHash();

        if (genesisHash === this.TESTNET_GENESIS_HASH) {
            console.log("genesisHash", genesisHash, "testnet");
            return "testnet";
        } else if (genesisHash === this.DEVNET_GENESIS_HASH) {
            console.log("genesisHash", genesisHash, "devnet");
            return "devnet";
        } else if (genesisHash === this.MAINNET_GENESIS_HASH) {
            console.log("genesisHash", genesisHash, "mainet");
            return "mainet";
        } else {
            return "unknown";
        }
    }
}


export class OpinionsMarket {
    common: Common;
    opinionsMarketProgram: anchor.Program<OpinionsMarketType>;

    constructor(common: Common) {
        this.common = common;

        // Override the program ID with the one from the config
        OpinionsMarketIdl.address =
            process.env.NEXT_PUBLIC_OPINIONS_MARKET_PROGRAM_ID ??
            OpinionsMarketIdl.address;

        this.opinionsMarketProgram = new anchor.Program<OpinionsMarketType>(
            OpinionsMarketIdl as OpinionsMarketType,
            this.common.provider
        );
    }

    getConfigPda(programId: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
    }

    getUserAccountPda(
        programId: PublicKey,
        userWallet: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [USER_ACCOUNT_SEED, userWallet.toBuffer()],
            programId
        );
    }

    getPostPda(
        programId: PublicKey,
        postIdHash: Uint8Array
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [POST_ACCOUNT_SEED, postIdHash],
            programId
        );
    }

    getPositionPda(
        programId: PublicKey,
        postPda: PublicKey,
        userWallet: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [POSITION_SEED, postPda.toBuffer(), userWallet.toBuffer()],
            programId
        );
    }

    getPostPotTokenAccountPda(
        programId: PublicKey,
        postPda: PublicKey,
        tokenMint: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [
                POST_POT_TOKEN_ACCOUNT_SEED,
                postPda.toBuffer(),
                tokenMint.toBuffer(),
            ],
            programId
        );
    }

    getPostPotAuthorityPda(
        programId: PublicKey,
        postPda: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [POST_POT_AUTHORITY_SEED, postPda.toBuffer()],
            programId
        );
    }

    getUserVaultTokenAccountPda(
        programId: PublicKey,
        userWallet: PublicKey,
        tokenMint: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [
                USER_VAULT_TOKEN_ACCOUNT_SEED,
                userWallet.toBuffer(),
                tokenMint.toBuffer(),
            ],
            programId
        );
    }

    getVaultAuthorityPda(programId: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [VAULT_AUTHORITY_SEED],
            programId
        );
    }

    getValidPaymentPda(
        programId: PublicKey,
        tokenMint: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [VALID_PAYMENT_SEED, tokenMint.toBuffer()],
            programId
        );
    }

    getProtocolTreasuryTokenAccountPda(
        programId: PublicKey,
        tokenMint: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [PROTOCOL_TREASURY_TOKEN_ACCOUNT_SEED, tokenMint.toBuffer()],
            programId
        );
    }

    getPostMintPayoutPda(
        programId: PublicKey,
        postPda: PublicKey,
        tokenMint: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [POST_MINT_PAYOUT_SEED, postPda.toBuffer(), tokenMint.toBuffer()],
            programId
        );
    }

    getUserPostMintClaimPda(
        programId: PublicKey,
        postPda: PublicKey,
        tokenMint: PublicKey,
        userWallet: PublicKey
    ): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [
                USER_POST_MINT_CLAIM_SEED,
                postPda.toBuffer(),
                tokenMint.toBuffer(),
                userWallet.toBuffer(),
            ],
            programId
        );
    }
}

type SolanaProgramContextType = {
    connection: ReturnType<typeof getConnection>;
    getProgramForWallet: (
        wallet: ConnectedStandardSolanaWallet
    ) => Program<OpinionsMarketType>;
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

            return new OpinionsMarket(new Common(connection, wallet.keypair));
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
