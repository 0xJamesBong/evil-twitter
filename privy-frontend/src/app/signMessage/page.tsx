"use client";

import { useState } from "react";
import { useWallets, useSignMessage, useSignTransaction } from "@privy-io/react-auth/solana";
import { VersionedTransaction } from "@solana/web3.js";
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
import { getBackendUrl } from "@/lib/config";

interface SessionData {
    message: string;
    signature: string;
    wallet: string;
    sessionAuthorityPda: string;
    expiresAt: number;
    txSignature?: string;
}

function SignMessageContent() {
    const { ready, authenticated, logout } = usePrivy();
    const { wallets } = useWallets();
    const { signMessage } = useSignMessage();
    const { signTransaction } = useSignTransaction();
    const { setSession } = useBackendUserStore();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSign = async () => {
        try {
            setLoading(true);
            setError(null);
            setSessionData(null);

            const selectedWallet = wallets[0];
            if (!selectedWallet) {
                throw new Error("No wallet connected");
            }

            // Step 1: Create message with timestamp and nonce
            const timestamp = Math.floor(Date.now() / 1000);
            const nonce = Math.random().toString(36).substring(7);
            const message = `delegate-session|${timestamp}|${nonce}`;
            const messageBytes = new TextEncoder().encode(message);

            // Step 2: User signs the message
            const result = await signMessage({
                message: messageBytes,
                wallet: selectedWallet,
                options: {
                    uiOptions: { title: "Sign to delegate session permissions" },
                },
            });

            const signatureBase58 = bs58.encode(result.signature);

            // Step 3: Send to backend /api/session/init
            const expiresAt = timestamp + 86400; // 24 hours from now
            const backendUrl = getBackendUrl();
            const initResponse = await fetch(`${backendUrl}/api/session/init`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wallet: selectedWallet.address,
                    signature: signatureBase58,
                    expires: expiresAt,
                    message,
                }),
            });

            if (!initResponse.ok) {
                const errorText = await initResponse.text();
                throw new Error(`Backend error: ${errorText}`);
            }

            const { tx_base64, session_authority_pda, expires_at } = await initResponse.json();

            // Step 4: Deserialize and sign the transaction
            const txBuffer = Buffer.from(tx_base64, "base64");
            const tx = VersionedTransaction.deserialize(txBuffer);

            const signedTxResult = await signTransaction({
                transaction: tx as any,
                wallet: selectedWallet,
            });

            // Extract the signed transaction
            const signedTx = (signedTxResult as any).transaction || signedTxResult;

            // Step 5: Submit signed transaction to backend
            const signedTxBase64 = Buffer.from(signedTx.serialize()).toString("base64");

            const submitResponse = await fetch(`${backendUrl}/api/session/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transaction: signedTxBase64 }),
            });

            if (!submitResponse.ok) {
                const errorText = await submitResponse.text();
                throw new Error(`Backend submit error: ${errorText}`);
            }

            const { signature: txSignature } = await submitResponse.json();

            // Step 6: Store session in Zustand
            setSession(session_authority_pda, expires_at);

            setSessionData({
                message,
                signature: signatureBase58,
                wallet: selectedWallet.address,
                sessionAuthorityPda: session_authority_pda,
                expiresAt: expires_at,
                txSignature,
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

                    {sessionData && (
                        <Card>
                            <CardContent>
                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                    <CheckCircleIcon sx={{ color: "success.main", mr: 1 }} />
                                    <Typography variant="h6">
                                        Session Delegation Successful
                                    </Typography>
                                </Box>

                                <Stack spacing={2}>
                                    {/* Session Authority PDA */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Session Authority PDA
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
                                                {sessionData.sessionAuthorityPda}
                                            </Typography>
                                        </Paper>
                                    </Box>

                                    {/* Expires At */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Expires At
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                            }}
                                        >
                                            <Typography variant="body1">
                                                {new Date(sessionData.expiresAt * 1000).toLocaleString()}
                                            </Typography>
                                        </Paper>
                                    </Box>

                                    {/* Transaction Signature */}
                                    {sessionData.txSignature && (
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                            >
                                                Transaction Signature
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
                                                    {sessionData.txSignature}
                                                </Typography>
                                            </Paper>
                                        </Box>
                                    )}

                                    <Divider sx={{ my: 1 }} />

                                    {/* Message */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Signed Message
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                            }}
                                        >
                                            <Typography variant="body2">
                                                {sessionData.message}
                                            </Typography>
                                        </Paper>
                                    </Box>
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

