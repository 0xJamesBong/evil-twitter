"use client";

import { Box, Typography, Paper, Container } from "@mui/material";
import { Construction as ConstructionIcon } from "@mui/icons-material";

export default function OrgPage() {
    return (
        <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 6,
                    textAlign: "center",
                    bgcolor: "background.paper",
                    borderRadius: 2,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                    }}
                >
                    <ConstructionIcon
                        sx={{
                            fontSize: 80,
                            color: "text.secondary",
                            opacity: 0.6,
                        }}
                    />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Under Construction
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ maxWidth: 400 }}
                    >
                        This page is currently being built. Check back soon!
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}

