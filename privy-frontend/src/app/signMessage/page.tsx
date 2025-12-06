"use client";

import "@/theme/types"; // Import type declarations
import { useState, useEffect, useMemo } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
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
import { useRenewSession, SessionData } from "@/hooks/useRenewSession";

function SignMessageContent() {
    const { ready, authenticated, logout } = usePrivy();
    const { wallets } = useWallets();
    const { renewSession, loading, error } = useRenewSession();
    const { setSession, sessionAuthorityPda, sessionKey, sessionExpiresAt, sessionUserWallet } = useBackendUserStore();
    const [newlyRegisteredSession, setNewlyRegisteredSession] = useState<SessionData | null>(null);

    // Get existing session from store or newly registered session
    const sessionData = useMemo<SessionData | null>(() => {
        // If we just registered a new session, use that
        if (newlyRegisteredSession) {
            return newlyRegisteredSession;
        }

        // Otherwise, check if we have an existing session in the store
        if (sessionAuthorityPda && sessionKey && sessionExpiresAt && sessionUserWallet) {
            return {
                sessionAuthorityPda,
                sessionKey,
                expiresAt: sessionExpiresAt,
                userWallet: sessionUserWallet,
            };
        }

        return null;
    }, [newlyRegisteredSession, sessionAuthorityPda, sessionKey, sessionExpiresAt, sessionUserWallet]);

    const handleRegister = async () => {
        try {
            const data = await renewSession();

            // Store session in Zustand
            setSession(
                data.sessionAuthorityPda,
                data.sessionKey,
                data.expiresAt,
                data.userWallet
            );

            // Set newly registered session to trigger display
            setNewlyRegisteredSession(data);
        } catch (err) {
            // Error is already handled by the hook
            console.error("Failed to register session:", err);
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
                                Register Session Key
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Sign a message with your Solana wallet to register a session key.
                                This allows the backend to sign transactions on your behalf for 30 days.
                                You only need to do this once.
                            </Typography>

                            {!selectedWallet && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    No wallet connected. Please connect a wallet first.
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleRegister}
                                disabled={loading || !selectedWallet}
                                sx={{ mb: 2 }}
                            >
                                {loading ? (
                                    <>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        Registering Session...
                                    </>
                                ) : (
                                    "Register Session Key"
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
                                        {newlyRegisteredSession ? "Session Registered Successfully" : "Current Session"}
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
                                                bgcolor: "background.paper",
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

                                    {/* Session Key */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            Session Key (Public Key)
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "background.paper",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {sessionData.sessionKey}
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
                                                bgcolor: "background.paper",
                                            }}
                                        >
                                            <Typography variant="body1">
                                                {new Date(sessionData.expiresAt * 1000).toLocaleString()}
                                            </Typography>
                                            <Chip
                                                label={`${Math.floor((sessionData.expiresAt - Math.floor(Date.now() / 1000)) / 86400)} days remaining`}
                                                color="success"
                                                size="small"
                                                sx={{ mt: 1 }}
                                            />
                                        </Paper>
                                    </Box>

                                    <Divider sx={{ my: 1 }} />

                                    {/* User Wallet */}
                                    <Box>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1, color: "text.secondary", fontWeight: 600 }}
                                        >
                                            User Wallet
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                bgcolor: "background.paper",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    wordBreak: "break-all",
                                                }}
                                            >
                                                {sessionData.userWallet}
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
