"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Chip,
    Divider,
} from "@mui/material";
import {
    Settings as SettingsIcon,
    Token as TokenIcon,
    Cloud as CloudIcon,
    Computer as ComputerIcon,
} from "@mui/icons-material";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import {
    getProgramId,
    fetchConfig,
    fetchValidPayment,
} from "@/lib/solana/config";
import { useNetworkStore } from "@/lib/stores/networkStore";
import { formatTokenBalance } from "@/lib/utils/formatting";

// Token mint addresses
const BLING_MINT = process.env.NEXT_PUBLIC_BLING_MINT || "";
const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || "";
const STABLECOIN_MINT = process.env.NEXT_PUBLIC_STABLECOIN_MINT || "";

type ConfigData = Awaited<ReturnType<typeof fetchConfig>>;
type ValidPaymentData = NonNullable<
    Awaited<ReturnType<typeof fetchValidPayment>>
>;

function ContractsContent() {
    const { ready, authenticated } = usePrivy();
    const { wallets } = useWallets();
    const network = useNetworkStore((state) => state.network);

    const [config, setConfig] = useState<ConfigData | null>(null);
    const [validPayments, setValidPayments] = useState<
        Record<string, ValidPaymentData>
    >({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const solanaWallet =
        wallets.find((w: any) => w.walletClientType === "privy") || wallets[0];

    useEffect(() => {
        if (!authenticated || !solanaWallet?.address) {
            setLoading(false);
            setError(
                !authenticated
                    ? "Please log in to view contract data"
                    : "Please connect a Solana wallet"
            );
            return;
        }

        const fetchContractData = async () => {
            setLoading(true);
            setError(null);

            try {
                const configData = await fetchConfig(solanaWallet);
                setConfig(configData);

                const payments: Record<string, ValidPaymentData> = {};
                const tokenMints = [
                    { name: "BLING", mint: BLING_MINT },
                    { name: "USDC", mint: USDC_MINT },
                    { name: "Stablecoin", mint: STABLECOIN_MINT },
                ].filter((t) => t.mint);

                for (const token of tokenMints) {
                    const payment = await fetchValidPayment(
                        solanaWallet,
                        token.mint
                    );
                    if (payment) {
                        payments[token.name] = payment;
                    }
                }

                setValidPayments(payments);
            } catch (err) {
                console.error("Error fetching contract data:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to fetch contract data"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchContractData();
    }, [authenticated, solanaWallet?.address, network]);

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated) {
        return <LoginPrompt />;
    }

    const networkIcon =
        network === "devnet" ? (
            <CloudIcon sx={{ fontSize: 20 }} />
        ) : (
            <ComputerIcon sx={{ fontSize: 20 }} />
        );

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Contract Configuration
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {networkIcon}
                    <Chip
                        label={network.toUpperCase()}
                        color={network === "devnet" ? "info" : "default"}
                        size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                        Program ID: {getProgramId() ? `${getProgramId().slice(0, 8)}...` : "N/A"}
                    </Typography>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {/* Config Account */}
                    {config && (
                        <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                            <Card>
                                <CardContent>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            mb: 2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        <SettingsIcon sx={{ fontSize: 20 }} />
                                        Config Account
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Admin:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {config.admin}
                                            </Typography>
                                        </Box>
                                        <Divider />
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Payer Authority:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {config.payerAuthority}
                                            </Typography>
                                        </Box>
                                        <Divider />
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                BLING Mint:
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {config.blingMint}
                                            </Typography>
                                        </Box>
                                        <Divider />
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Base Duration:
                                            </Typography>
                                            <Typography variant="body2">
                                                {config.baseDurationSecs} seconds
                                                ({(config.baseDurationSecs / 60).toFixed(1)}{" "}
                                                minutes)
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Max Duration:
                                            </Typography>
                                            <Typography variant="body2">
                                                {config.maxDurationSecs} seconds
                                                ({(config.maxDurationSecs / 60).toFixed(1)}{" "}
                                                minutes)
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Extension Per Vote:
                                            </Typography>
                                            <Typography variant="body2">
                                                {config.extensionPerVoteSecs}{" "}
                                                seconds
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    {/* Valid Payment Accounts */}
                    <Box sx={{ width: { xs: "100%", md: "calc(50% - 12px)" } }}>
                        <Card>
                            <CardContent>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{
                                        mb: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    <TokenIcon sx={{ fontSize: 20 }} />
                                    Valid Payment Tokens
                                </Typography>
                                {Object.keys(validPayments).length === 0 ? (
                                    <Alert severity="info">
                                        No valid payment tokens found
                                    </Alert>
                                ) : (
                                    <Stack spacing={2}>
                                        {Object.entries(validPayments).map(
                                            ([name, payment], index) => (
                                                <Box key={name}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems: "center",
                                                            mb: 1,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="subtitle2"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                {name}
                                                            </Typography>
                                                            <Chip
                                                                label={
                                                                    payment.enabled
                                                                        ? "Enabled"
                                                                        : "Disabled"
                                                                }
                                                                color={
                                                                    payment.enabled
                                                                        ? "success"
                                                                        : "default"
                                                                }
                                                                size="small"
                                                            />
                                                        </Box>
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            fontFamily:
                                                                "monospace",
                                                            fontSize: "0.75rem",
                                                            mb: 0.5,
                                                        }}
                                                    >
                                                        {payment.tokenMint}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Price:{" "}
                                                        {payment.priceInBling}{" "}
                                                        {/* {formatTokenBalance(
                                                            payment.priceInBling,
                                                            9
                                                        )}{" "} */}
                                                        BLING per token
                                                    </Typography>
                                                    {index <
                                                        Object.keys(validPayments)
                                                            .length -
                                                        1 && (
                                                            <Divider sx={{ mt: 2 }} />
                                                        )}
                                                </Box>
                                            )
                                        )}
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            )}
        </Box>
    );
}

export default function Contracts() {
    return <ContractsContent />;
}

