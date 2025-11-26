"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Box, Button, Typography } from "@mui/material";
import { Login as LoginIcon } from "@mui/icons-material";

interface LoginPromptProps {
    title?: string;
    message?: string;
    showBackground?: boolean;
}

export function LoginPrompt({
    title = "Please log in",
    message = "You need to be logged in to access this page.",
    showBackground = false,
}: LoginPromptProps) {
    const { login } = usePrivy();

    const handleLogin = () => {
        login();
        setTimeout(() => {
            (
                document.querySelector(
                    'input[type="email"]'
                ) as HTMLInputElement
            )?.focus();
        }, 150);
    };

    if (showBackground) {
        return (
            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    height: "calc(100vh - 60px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Box
                    component="img"
                    src="./BG.svg"
                    alt="Background"
                    sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        zIndex: 0,
                    }}
                />
                <Box
                    sx={{
                        position: "relative",
                        zIndex: 10,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        maxWidth: 600,
                        textAlign: "center",
                        px: 3,
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            color: "white",
                            fontWeight: 600,
                            mb: 2,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: "white",
                            mb: 4,
                            opacity: 0.9,
                        }}
                    >
                        {message}
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleLogin}
                        startIcon={<LoginIcon />}
                        sx={{
                            borderRadius: "9999px",
                            px: 4,
                            py: 1.5,
                            fontSize: "1rem",
                            bgcolor: "white",
                            color: "grey.900",
                            "&:hover": {
                                bgcolor: "grey.100",
                            },
                        }}
                    >
                        Log in
                    </Button>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "50vh",
                gap: 3,
                p: 4,
            }}
        >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
                {message}
            </Typography>
            <Button
                variant="contained"
                size="large"
                onClick={handleLogin}
                startIcon={<LoginIcon />}
                sx={{
                    borderRadius: "9999px",
                    px: 4,
                    py: 1.5,
                }}
            >
                Log in
            </Button>
        </Box>
    );
}

