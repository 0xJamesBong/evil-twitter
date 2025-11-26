"use client";

import { Box } from "@mui/material";
import { Header } from "@/components/ui/header";
import { LeftSidebar } from "./LeftSidebar";

interface AuthenticatedLayoutProps {
    children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
    return (
        <Box
            sx={{
                backgroundColor: "background.default",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Header />
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    height: "calc(100vh - 60px)",
                    overflow: "hidden",
                }}
            >
                <LeftSidebar />
                <Box
                    sx={{
                        flexGrow: 1,
                        overflowY: "auto",
                        borderRight: 1,
                        borderColor: "grey.200",
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

