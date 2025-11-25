'use client';

import React, { useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
} from '@mui/material';
import { useBackendUserStore } from '../lib/stores/backendUserStore';
import { useShopStore } from '../lib/stores/shopStore';
import { useAssetsStore } from '../lib/stores/assetsStore';

export function Shop() {
    const { user } = useBackendUserStore();
    const fetchUserAssets = useAssetsStore((state) => state.fetchUserAssets);
    const {
        catalog,
        loading,
        error,
        buying,
        selectedCategory,
        fetchCatalog,
        buyItem,
        setSelectedCategory,
        clearError,
        getFilteredCatalog,
        getCategories,
    } = useShopStore();

    useEffect(() => {
        if (catalog.length === 0) {
            fetchCatalog();
        }
    }, []);

    const handleBuyItem = async (catalogId: string) => {
        if (!user?._id?.$oid) {
            return;
        }

        const result = await buyItem(user._id.$oid, catalogId);

        if (result.success) {
            await fetchUserAssets(user._id.$oid);
            alert('Item purchased successfully! Check your assets.');
        }
    };

    const getRarityColor = () => '#9370DB';

    const categories = getCategories();
    const filteredCatalog = getFilteredCatalog();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
                Item Shop
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Browse our catalog of powerful tools, defensive gear, support items, and utility gadgets.
                Each item has unique stats and abilities to enhance your Twitter experience.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
                    {error}
                </Alert>
            )}

            {/* Category Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
                <Tabs
                    value={selectedCategory}
                    onChange={(_, newValue) => setSelectedCategory(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {categories.map((cat) => (
                        <Tab
                            key={cat}
                            label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                            value={cat}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Catalog Grid */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                },
                gap: 3
            }}>
                {filteredCatalog.map((catalogItem) => {
                    const item = catalogItem.item;
                    const metadata = item?.item_type_metadata?.data;

                    if (!item || !metadata) return null;

                    return (
                        <Card
                            key={catalogItem.catalog_id}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                border: '2px solid',
                                borderColor: getRarityColor(),
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 16px ${getRarityColor()}40`,
                                },
                            }}
                        >
                            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                {/* Image */}
                                <Box sx={{ textAlign: 'center', mb: 2 }}>
                                    <Typography sx={{ fontSize: '4rem' }}>
                                        {item.image_url}
                                    </Typography>
                                </Box>

                                {/* Name */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        {item.name}
                                    </Typography>
                                    <Chip
                                        label={metadata.tool_type.toUpperCase()}
                                        size="small"
                                        sx={{
                                            backgroundColor: getRarityColor(),
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '0.7rem',
                                        }}
                                    />
                                </Box>

                                {/* Description */}
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2, flexGrow: 1 }}
                                >
                                    {item.description}
                                </Typography>

                                {/* Stats */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                        <strong>Type:</strong> {metadata.tool_type}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                        <strong>Impact:</strong> {metadata.impact}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                        <strong>Durability:</strong> {metadata.max_health}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        <strong>Degrade/use:</strong> {metadata.degrade_per_use}
                                    </Typography>
                                </Box>

                                {/* Price & Buy Button */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        {(catalogItem.price / 1000000).toFixed(6)} USDC
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => handleBuyItem(catalogItem.catalog_id)}
                                        disabled={buying === catalogItem.catalog_id || !user}
                                        sx={{ minWidth: 80 }}
                                    >
                                        {buying === catalogItem.catalog_id ? (
                                            <CircularProgress size={20} />
                                        ) : (
                                            'Buy'
                                        )}
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>

            {filteredCatalog.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        No items in this category
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
