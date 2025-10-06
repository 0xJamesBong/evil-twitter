"use client";

import { useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Chip,
    LinearProgress,
    Stack,
    Button,
} from "@mui/material";
import Link from "next/link";
import { useWeaponsStore, Weapon } from "../lib/stores/weaponsStore";

interface WeaponsPanelProps {
    userId?: string;
    maxDisplay?: number;
}

function CompactWeaponCard({ weapon }: { weapon: Weapon }) {
    const healthPercentage = (weapon.health / weapon.max_health) * 100;
    const isBroken = weapon.health <= 0;

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                opacity: isBroken ? 0.5 : 1,
                transition: "all 0.2s",
                "&:hover": {
                    borderColor: "primary.main",
                    backgroundColor: "action.hover",
                },
            }}
        >
            {/* Emoji Icon */}
            <Box
                sx={{
                    fontSize: "2.5rem",
                    width: 60,
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: 1,
                    flexShrink: 0,
                }}
            >
                {weapon.image_url}
            </Box>

            {/* Weapon Info */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {weapon.name}
                    </Typography>
                    {isBroken && <Chip label="BROKEN" size="small" color="error" />}
                </Box>

                {/* Stats */}
                <Box sx={{ display: "flex", gap: 2, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        ⚔️ {weapon.damage}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        💚 {weapon.health}/{weapon.max_health}
                    </Typography>
                </Box>

                {/* Health Bar */}
                <LinearProgress
                    variant="determinate"
                    value={healthPercentage}
                    sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.1)",
                        "& .MuiLinearProgress-bar": {
                            backgroundColor:
                                healthPercentage > 50
                                    ? "success.main"
                                    : healthPercentage > 25
                                        ? "warning.main"
                                        : "error.main",
                        },
                    }}
                />
            </Box>
        </Box>
    );
}

export function WeaponsPanel({ userId, maxDisplay = 3 }: WeaponsPanelProps) {
    const { weapons, fetchUserWeapons, isLoading } = useWeaponsStore();

    useEffect(() => {
        if (userId) {
            fetchUserWeapons(userId);
        }
    }, [userId, fetchUserWeapons]);

    const displayWeapons = weapons.slice(0, maxDisplay);
    const hasMore = weapons.length > maxDisplay;

    if (isLoading && weapons.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Loading weapons...
                </Typography>
            </Paper>
        );
    }

    if (weapons.length === 0) {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 3,
                    textAlign: "center",
                    borderStyle: "dashed",
                }}
            >
                <Typography variant="body2" fontWeight={600} gutterBottom>
                    No Weapons Yet
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                    Mint your first weapon to start your arsenal!
                </Typography>
                <Button
                    component={Link}
                    href="/weapons"
                    variant="contained"
                    size="small"
                    sx={{ borderRadius: "9999px" }}
                >
                    Mint Weapon
                </Button>
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                }}
            >
                <Typography variant="h6" fontWeight={700}>
                    🗡️ Arsenal
                </Typography>
                <Chip label={weapons.length} size="small" color="primary" />
            </Box>

            <Stack spacing={1}>
                {displayWeapons.map((weapon) => (
                    <CompactWeaponCard key={weapon._id.$oid} weapon={weapon} />
                ))}
            </Stack>

            {hasMore && (
                <Button
                    component={Link}
                    href="/weapons"
                    fullWidth
                    variant="text"
                    size="small"
                    sx={{ mt: 1 }}
                >
                    View All ({weapons.length})
                </Button>
            )}

            <Button
                component={Link}
                href="/weapons"
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mt: 1, borderRadius: "9999px" }}
            >
                Mint New Weapon
            </Button>
        </Paper>
    );
}

