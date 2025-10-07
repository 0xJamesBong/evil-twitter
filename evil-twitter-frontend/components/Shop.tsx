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

export function Shop() {
    const { user } = useBackendUserStore();
    const {
        catalog,
        loading,
        error,
        creating,
        selectedCategory,
        fetchCatalog,
        createWeapon,
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

    const handleCreateWeapon = async (catalogId: string) => {
        if (!user?._id?.$oid) {
            // This will be handled by the store's error state
            return;
        }

        const result = await createWeapon(user._id.$oid, catalogId);

        if (result.success) {
            alert('Weapon created successfully! Check your arsenal.');
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'legendary':
                return '#FFD700';
            case 'rare':
                return '#9370DB';
            case 'uncommon':
                return '#4169E1';
            default:
                return '#808080';
        }
    };

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
                Weapon Shop
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Select from our arsenal of powerful weapons, defensive gear, healing items, and utility gadgets.
                Each item has unique stats and abilities to enhance your Twitter battles.
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
                {filteredCatalog.map((item) => (
                    <Card
                        key={item.id}
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            border: '2px solid',
                            borderColor: getRarityColor(item.rarity),
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 8px 16px ${getRarityColor(item.rarity)}40`,
                            },
                        }}
                    >
                        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Emoji Icon */}
                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                <Typography sx={{ fontSize: '4rem' }}>
                                    {item.emoji}
                                </Typography>
                            </Box>

                            {/* Name & Rarity */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    {item.name}
                                </Typography>
                                <Chip
                                    label={item.rarity.toUpperCase()}
                                    size="small"
                                    sx={{
                                        backgroundColor: getRarityColor(item.rarity),
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
                                    <strong>Health:</strong> {item.max_health}
                                </Typography>
                                {item.attack_power > 0 && (
                                    <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                        <strong>Attack:</strong> {item.attack_power}
                                    </Typography>
                                )}
                                {item.heal_power > 0 && (
                                    <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                        <strong>Heal:</strong> {item.heal_power}
                                    </Typography>
                                )}
                            </Box>

                            {/* Price & Create Button */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    ${item.price}
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => handleCreateWeapon(item.id)}
                                    disabled={creating === item.id || !user}
                                    sx={{ minWidth: 80 }}
                                >
                                    {creating === item.id ? (
                                        <CircularProgress size={20} />
                                    ) : (
                                        'Create'
                                    )}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
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

