"use client";

import "@/theme/types"; // Import type declarations
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
import CreateAWallet from "@/components/sections/create-a-wallet";
import UserObject from "@/components/sections/user-object";
import FundWallet from "@/components/sections/fund-wallet";
import LinkAccounts from "@/components/sections/link-accounts";
import UnlinkAccounts from "@/components/sections/unlink-accounts";
import WalletActions from "@/components/sections/wallet-actions";
import SessionSigners from "@/components/sections/session-signers";
import WalletManagement from "@/components/sections/wallet-management";
import MFA from "@/components/sections/mfa";

import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { usePingStore } from "@/lib/stores/pingStore";


function TestContent() {
    const { ready, authenticated, logout, user: privyUser } = usePrivy();
    const { user: backendUser, isLoading, error } = useBackendUserStore();
    const { ping, response, isLoading: isPinging, error: pingError } = usePingStore();

    console.log("Test, backendUser:", backendUser);
    console.log("Test, privyUser:", privyUser);


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
                    {/* Backend Connection Test */}
                    <Card sx={{ bgcolor: "background.paper" }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Backend Connection Test
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    try {
                                        await ping();
                                        console.log("Ping successful, response:", response);
                                    } catch (e) {
                                        console.error("Ping failed:", e);
                                    }
                                }}
                                disabled={isPinging}
                                sx={{ mb: 2 }}
                            >
                                {isPinging ? (
                                    <>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        Pinging...
                                    </>
                                ) : (
                                    "Ping Backend"
                                )}
                            </Button>
                            {response && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    <strong>Response:</strong> {response}
                                </Alert>
                            )}
                            {pingError && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    <strong>Error:</strong> {pingError}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* User Data Display */}
                    <Card sx={{ bgcolor: "background.paper" }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                User Data
                            </Typography>

                            {/* Privy User Data */}
                            <Box sx={{ mb: 3 }}>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ mb: 1, color: "primary.main", fontWeight: 600 }}
                                >
                                    Privy User Data
                                </Typography>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        bgcolor: "background.paper",
                                        maxHeight: 384,
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
                                            color: "text.primary",
                                        }}
                                    >
                                        {privyUser
                                            ? JSON.stringify(privyUser, null, 2)
                                            : "No Privy user data (not authenticated)"}
                                    </Typography>
                                </Paper>
                            </Box>

                            {/* Backend User Data */}
                            <Box>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ mb: 1, color: "success.main", fontWeight: 600 }}
                                >
                                    Backend User Data
                                </Typography>
                                {isLoading && (
                                    <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                        <CircularProgress size={16} />
                                        <Typography variant="body2" color="text.secondary">
                                            Loading backend user...
                                        </Typography>
                                    </Box>
                                )}
                                {error && (
                                    <Alert severity="error" sx={{ mb: 1 }}>
                                        Error: {error}
                                    </Alert>
                                )}
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        bgcolor: "background.paper",
                                        maxHeight: 384,
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
                                            color: "text.primary",
                                        }}
                                    >
                                        {backendUser
                                            ? JSON.stringify(backendUser, null, 2)
                                            : "No backend user data (not onboarded)"}
                                    </Typography>
                                </Paper>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Section Components */}
                    <CreateAWallet />
                    <FundWallet />
                    <LinkAccounts />
                    <UnlinkAccounts />
                    <WalletActions />
                    <SessionSigners />
                    <WalletManagement />
                    <MFA />
                </Stack>
            </Box>
            <UserObject />
        </Box>
    );
}

export default function Test() {
    return <TestContent />;
}

