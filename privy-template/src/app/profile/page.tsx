"use client";

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
    Avatar,
} from "@mui/material";
import { ArrowBack as ArrowLeftIcon } from "@mui/icons-material";

import { FullScreenLoader } from "@/components/ui/fullscreen-loader";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

function ProfileContent() {
    const { ready, authenticated, logout } = usePrivy();
    const { user: backendUser, isLoading, error } = useBackendUserStore();

    if (!ready) {
        return <FullScreenLoader />;
    }

    if (!authenticated) {
        return (
            <Box
                sx={{
                    backgroundColor: "background.default",
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Typography>Please log in to view your profile</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>

            {isLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Alert>
            )}

            {backendUser && (
                <Card>
                    <CardContent>
                        <Stack spacing={3}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Avatar
                                    src={backendUser.profile?.avatarUrl || undefined}
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        bgcolor: "primary.main",
                                    }}
                                >
                                    {backendUser.profile?.displayName
                                        ?.charAt(0)
                                        .toUpperCase() || "U"}
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                        {backendUser.profile?.displayName || "User"}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        @{backendUser.profile?.handle || "unknown"}
                                    </Typography>
                                </Box>
                            </Box>

                            {backendUser.profile?.bio && (
                                <Typography variant="body1">
                                    {backendUser.profile.bio}
                                </Typography>
                            )}

                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    bgcolor: "grey.50",
                                    maxHeight: 400,
                                    overflow: "auto",
                                }}
                            >
                                <Typography variant="h6" gutterBottom>
                                    Backend User Data
                                </Typography>
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
                                    {JSON.stringify(backendUser, null, 2)}
                                </Typography>
                            </Paper>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {!backendUser && !isLoading && (
                <Alert severity="info">
                    No profile data available. Please complete onboarding.
                </Alert>
            )}
        </Box>
    );
}

export default function Profile() {
    return <ProfileContent />;
}
