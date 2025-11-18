"use client";

import { useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Grid,
    Chip,
    Paper,
    Alert,
} from "@mui/material";
import { useAssetsStore, Asset } from "../lib/stores/assetsStore";

interface AssetsListProps {
    userId?: string;
    assets?: Asset[];
}

function AssetCard({ asset }: { asset: Asset }) {
    const metadata = asset.item?.item_type_metadata?.data;
    if (!metadata) return null;

    const healthPercentage = (metadata.health / Math.max(metadata.max_health, 1)) * 100;
    const isBroken = metadata.health <= 0;

    return (
        <Card
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                opacity: isBroken ? 0.6 : 1,
                position: "relative",
            }}
        >
            {isBroken && (
                <Chip
                    label="BROKEN"
                    color="error"
                    size="small"
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        fontWeight: 700,
                    }}
                />
            )}

            <Box
                sx={{
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8rem",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                    }}
                />
                <Box sx={{ position: "relative", zIndex: 1 }}>
                    {asset.item?.image_url}
                </Box>
            </Box>

            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h3" gutterBottom fontWeight={700}>
                    {asset.item?.name}
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    paragraph
                    sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {asset.item?.description}
                </Typography>

                <Box sx={{ mt: 2 }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 1,
                        }}
                    >
                        <Typography variant="body2" fontWeight={600}>
                            Health
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {metadata.health.toLocaleString()} /{" "}
                            {metadata.max_health.toLocaleString()}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={healthPercentage}
                        sx={{
                            height: 8,
                            borderRadius: 4,
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

                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        mt: 2,
                        pt: 2,
                        borderTop: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Impact
                        </Typography>
                        <Typography variant="body1" fontWeight={700}>
                            ⚡️ {metadata.impact}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Degrade
                        </Typography>
                        <Typography variant="body1" fontWeight={700}>
                            -{metadata.degrade_per_use}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Type
                        </Typography>
                        <Typography variant="body1" fontWeight={700}>
                            {metadata.tool_type}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

export function AssetsList({ userId, assets: providedAssets }: AssetsListProps) {
    const { assets: storeAssets, fetchUserAssets, isLoading, error } = useAssetsStore();

    const assets = providedAssets || storeAssets;

    useEffect(() => {
        if (userId && !providedAssets) {
            fetchUserAssets(userId);
        }
    }, [userId, providedAssets, fetchUserAssets]);

    if (isLoading) {
        return (
            <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                    Loading assets...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {error}
            </Alert>
        );
    }

    if (!assets || assets.length === 0) {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 4,
                    textAlign: "center",
                    borderStyle: "dashed",
                }}
            >
                <Typography variant="h6" gutterBottom>
                    No Assets Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Visit the shop to start building your collection!
                </Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ py: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={700} sx={{ px: 2 }}>
                📦 Your Assets ({assets.length})
            </Typography>
            <Grid container spacing={2} sx={{ px: 2 }}>
                {assets.map((asset, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={asset.id?.$oid || index}>
                        <AssetCard asset={asset} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
