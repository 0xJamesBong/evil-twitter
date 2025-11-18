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
import { useAssetsStore, Asset } from "../lib/stores/assetsStore";

interface AssetsPanelProps {
    userId?: string;
    maxDisplay?: number;
}

function CompactAssetCard({ asset }: { asset: Asset }) {
    const metadata = asset.item?.item_type_metadata?.data;
    if (!metadata) return null;

    const healthPercentage = (metadata.health / Math.max(metadata.max_health, 1)) * 100;
    const isBroken = metadata.health <= 0;

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
            {/* Icon */}
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
                {asset.item?.image_url}
            </Box>

            {/* Asset Info */}
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
                        {asset.item?.name}
                    </Typography>
                    {isBroken && <Chip label="BROKEN" size="small" color="error" />}
                </Box>

                {/* Stats */}
                <Box sx={{ display: "flex", gap: 2, mb: 0.5, flexWrap: "wrap" }}>
                    <Typography variant="caption" color="text.secondary">
                        🧰 {metadata.tool_type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        ⚡️ Impact: {metadata.impact}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        💚 {metadata.health}/{metadata.max_health}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        🔧 Degrade: -{metadata.degrade_per_use}
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

export function AssetsPanel({ userId, maxDisplay = 3 }: AssetsPanelProps) {
    const { assets, fetchUserAssets, isLoading } = useAssetsStore();

    useEffect(() => {
        if (userId) {
            fetchUserAssets(userId);
        }
    }, [userId, fetchUserAssets]);

    const displayAssets = assets.slice(0, maxDisplay);
    const hasMore = assets.length > maxDisplay;

    if (isLoading && assets.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                    Loading assets...
                </Typography>
            </Paper>
        );
    }

    if (assets.length === 0) {
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
                    No Assets Yet
                </Typography>
                <Typography variant="caption" color="text.secondary" paragraph>
                    Visit the shop to build your collection of tools and items.
                </Typography>
                <Button
                    component={Link}
                    href="/shop"
                    variant="contained"
                    size="small"
                    sx={{ borderRadius: "9999px" }}
                >
                    Open Shop
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
                    📦 Your Assets
                </Typography>
                <Chip label={assets.length} size="small" color="primary" />
            </Box>

            <Stack spacing={1}>
                {displayAssets.map((asset, index) => (
                    <CompactAssetCard key={asset.id?.$oid || index} asset={asset} />
                ))}
            </Stack>

            {hasMore && (
                <Button
                    component={Link}
                    href="/shop"
                    fullWidth
                    variant="text"
                    size="small"
                    sx={{ mt: 1 }}
                >
                    View All ({assets.length})
                </Button>
            )}

            <Button
                component={Link}
                href="/shop"
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mt: 1, borderRadius: "9999px" }}
            >
                Visit Item Shop
            </Button>
        </Paper>
    );
}
