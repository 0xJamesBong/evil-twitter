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
    Divider,
    Chip,
} from "@mui/material";
import { ArrowBack as ArrowLeftIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { API_BASE_URL } from "@/lib/config";

interface SignatureData {
    message: string;
    signature: string;
    wallet: string;
    backendResponse?: {
        success: boolean;
        message: string;
        received?: {
            wallet: string;
            session_pubkey: string;
            expires: number;
            message: string;
        };
    };
}

function SignMessageContent() {
    const { ready, authenticated, logout } = usePrivy();
    const { wallets } = useWallets();
    const { signMessage } = useSignMessage();
    const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSign = async () => {
        try {
            setLoading(true);
            setError(null);
            setSignatureData(null);

            const selectedWallet = wallets[0];
            if (!selectedWallet) {
                throw new Error("No wallet connected");
            }

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

            // Send to backend
            const response = await fetch(`${API_BASE_URL}/api/session/delegate`, {
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

            let backendResponse;
            if (response.ok) {
                backendResponse = await response.json();
            } else {
                const errorText = await response.text();
                throw new Error(`Backend error: ${errorText}`);
            }

            setSignatureData({
                message,
                signature: signatureBase58,
                wallet: selectedWallet.address,
                backendResponse,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to sign message";
            setError(errorMessage);
            console.error("Failed to sign message:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated) {
        return <LoginPrompt />;
    }

    const selectedWallet = wallets[0];

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                height: { md: "calc(100vh - 60px)" },
            }}
        >
            <Box
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    p: 2,
                    pl: { md: 4 },
                }}
            >
                <Button
                    startIcon={<ArrowLeftIcon />}
                    onClick={logout}
                    sx={{ mb: 2 }}
                >
                    Logout
                </Button>

                <Stack spacing={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Sign Message
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Sign a message with your Solana wallet to delegate session signing permissions.
                            </Typography>

                            {!selectedWallet && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    No wallet connected. Please connect a wallet first.
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleSign}
                                disabled={loading || !selectedWallet}
                                sx={{ mb: 2 }}
                            >
                                {loading ? (
                                    <>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        Signing...
                                    </>
                                ) : (
                                    "Sign Message"
                                )}
                            </Button>

                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    <strong>Error:</strong> {error}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {signatureData && (
                        <Card>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                    <CheckCircleIcon sx={{ color: "success.main", mr: 1 }} />
                                    <Typography variant="h6">
                                        Message Signed Successfully
                                    </Typography>
                                </Box>

                                <Stack spacing={2}>
                                    {/* Message */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Message
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                            }}
                                        >
                                            <Typography variant="body1">
                                                {signatureData.message}
                                            </Typography>
                                        </Paper>
                                    </Box>

                                    {/* Wallet Address */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Wallet Address
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {signatureData.wallet}
                                            </Typography>
                                        </Paper>
                                    </Box>

                                    {/* Signature */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Signature (Base58)
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                                maxHeight: 200,
                                                overflow: "auto",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                    fontSize: "0.75rem",
                                                }}
                                            >
                                                {signatureData.signature}
                                            </Typography>
                                        </Paper>
                                    </Box>

                                    {/* Backend Response */}
                                    {signatureData.backendResponse && (
                                        <>
                                            <Divider sx={{ my: 1 }} />
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                                >
                                                    Backend Response
                                                </Typography>
                                                <Chip
                                                    label={signatureData.backendResponse.success ? "Success" : "Failed"}
                                                    color={signatureData.backendResponse.success ? "success" : "error"}
                                                    size="small"
                                                    sx={{ mb: 1 }}
                                                />
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: "grey.50",
                                                        maxHeight: 300,
                                                        overflow: "auto",
                                                    }}
                                                >
                                                    <Typography
                                                        component="pre"
                                                        sx={{
                                                            fontSize: "0.75rem",
                                                            whiteSpace: "pre-wrap",
                                                            wordBreak: "break-word",
                                                            fontFamily: "monospace",
                                                            m: 0,
                                                        }}
                                                    >
                                                        {JSON.stringify(signatureData.backendResponse, null, 2)}
                                                    </Typography>
                                                </Paper>
                                            </Box>
                                        </>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}

export default function SignMessage() {
    return <SignMessageContent />;
}

