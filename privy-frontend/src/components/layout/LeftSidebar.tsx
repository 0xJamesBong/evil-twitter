"use client";

import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
    Box,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Button,
} from "@mui/material";
import {
    Home as HomeIcon,
    Person as PersonIcon,
    Settings as SettingsIcon,
    Science as TestIcon,
    Logout as LogoutIcon,
    Message as MessageIcon,
    Code as CodeIcon,
    AccountBalanceWallet as RewardsIcon,
} from "@mui/icons-material";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import { useMemo } from "react";

export function LeftSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { authenticated, logout } = usePrivy();
    const { user: backendUser } = useBackendUserStore();

    // Get profile path for current user
    const profilePath = useMemo(() => {
        if (!backendUser) return null;
        if (backendUser.profile?.handle) {
            return `/@${backendUser.profile.handle.replace(/^@+/, "")}`;
        }
        if (backendUser.id) {
            return `/user/${backendUser.id}`;
        }
        return null;
    }, [backendUser]);

    const navItems = useMemo(() => {
        const items = [
            { label: "Home", path: "/", icon: <HomeIcon /> },
            { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
            { label: "Rewards", path: "/rewards", icon: <RewardsIcon /> },
            { label: "Test", path: "/test", icon: <TestIcon /> },
            { label: "Sign Message", path: "/signMessage", icon: <MessageIcon /> },
            { label: "Contracts", path: "/contracts", icon: <CodeIcon /> },
        ];

        // Insert Profile link after Home if user has a profile
        if (profilePath) {
            items.splice(1, 0, { label: "Profile", path: profilePath, icon: <PersonIcon /> });
        }

        return items;
    }, [profilePath]);

    return (
        <Paper
            elevation={0}
            sx={{
                width: 280,
                height: "100%",
                borderRight: 1,
                borderColor: "rgba(255,255,255,0.06)",
                borderRadius: 0,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Box sx={{ p: 2, flexGrow: 1 }}>
                <List sx={{ p: 0 }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    onClick={() => router.push(item.path)}
                                    selected={isActive}
                                    sx={{
                                        borderRadius: 2,
                                        "&.Mui-selected": {
                                            bgcolor: (theme) => theme.palette.bg?.elevated || theme.palette.action.selected,
                                            color: "primary.main",
                                            "&:hover": {
                                                bgcolor: (theme) => theme.palette.bg?.elevated || theme.palette.action.selected,
                                            },
                                        },
                                        "&:hover": {
                                            bgcolor: (theme) => theme.palette.bg?.surface2 || theme.palette.action.hover,
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            color: isActive ? "primary.main" : "text.secondary",
                                            minWidth: 40,
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{
                                            fontWeight: isActive ? 600 : 400,
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>

            {authenticated && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: "rgba(255,255,255,0.06)" }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<LogoutIcon />}
                        onClick={logout}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            justifyContent: "flex-start",
                            px: 2,
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            )}
        </Paper>
    );
}

