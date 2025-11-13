import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList, ScrollView } from 'react-native';
import { Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useShopStore, WeaponCatalogItem } from '@/lib/stores/shopStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

export default function ShopScreen() {
    const { user } = useBackendUserStore();
    const {
        catalog,
        loading,
        error,
        buying,
        selectedCategory,
        fetchCatalog,
        buyWeapon,
        setSelectedCategory,
        clearError,
        getFilteredCatalog,
        getCategories,
    } = useShopStore();

    useEffect(() => {
        if (catalog.length === 0) {
            fetchCatalog();
        }
    }, [catalog.length, fetchCatalog]);

    const handleBuyWeapon = async (catalogId: string) => {
        if (!user?._id?.$oid) {
            return;
        }

        const result = await buyWeapon(user._id.$oid, catalogId);

        if (result.success) {
            // Show success message
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

    console.log("Shop Debug:", {
        catalogLength: catalog.length,
        filteredCatalogLength: filteredCatalog.length,
        selectedCategory,
        categories,
        loading,
        error
    });

    const renderWeapon = ({ item }: { item: WeaponCatalogItem }) => {
        const weaponItem = item.item;
        const metadata = weaponItem?.item_type_metadata?.data;
        const rarity = metadata?.tool_type === 'Weapon' ? 'rare' : 'uncommon'; // Default rarity

        return (
            <Card style={[styles.weaponCard, { borderColor: getRarityColor(rarity) }]}>
                <Card.Content>
                    <View style={styles.weaponHeader}>
                        <AppText variant="body" style={{ fontSize: 48 }}>{weaponItem?.image_url || '⚔️'}</AppText>
                    </View>

                    <AppText variant="h4" style={{ marginBottom: spacing.sm }}>{weaponItem?.name || 'Unknown Weapon'}</AppText>
                    <AppText variant="body" color="secondary" style={{ marginBottom: spacing.md }}>{weaponItem?.description || ''}</AppText>

                    {metadata && (
                        <View style={styles.weaponStats}>
                            <AppText variant="small" color="tertiary">Type: {metadata.tool_type}</AppText>
                            <AppText variant="small" color="tertiary">Impact: {metadata.impact}</AppText>
                            <AppText variant="small" color="tertiary">Durability: {metadata.health}/{metadata.max_health}</AppText>
                            <AppText variant="small" color="tertiary">Degrade/use: {metadata.degrade_per_use}</AppText>
                        </View>
                    )}

                    <View style={styles.weaponFooter}>
                        <AppText variant="h4" color="accent">${item.price}</AppText>
                        <AppButton
                            variant="primary"
                            size="sm"
                            onPress={() => handleBuyWeapon(item.catalog_id)}
                            disabled={buying === item.catalog_id || !user}
                            loading={buying === item.catalog_id}
                        >
                            Buy
                        </AppButton>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    if (loading) {
        return (
            <View style={styles.content}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <AppText variant="bodyLarge" style={{ marginTop: spacing.lg }}>Loading weapons...</AppText>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.content}>
            <AppText variant="bodyLarge" color="secondary" style={{ marginBottom: spacing.xl, lineHeight: 22 }}>
                Select from our arsenal of offensive weapons, defensive gear, support tools, and utility gadgets.
                Each item has unique stats and abilities to enhance your Twitter battles.
            </AppText>

            {error && (
                <Card style={styles.errorCard}>
                    <Card.Content>
                        <AppText variant="body" color="inverse" style={{ marginBottom: spacing.sm }}>{error}</AppText>
                        <AppButton variant="primary" size="sm" onPress={clearError}>Dismiss</AppButton>
                    </Card.Content>
                </Card>
            )}

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => (
                    <Chip
                        key={cat}
                        selected={selectedCategory === cat}
                        onPress={() => setSelectedCategory(cat)}
                        style={styles.categoryChip}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Chip>
                ))}
            </ScrollView>

            {/* Weapons Grid */}
            {filteredCatalog.length > 0 ? (
                <FlatList
                    data={filteredCatalog}
                    renderItem={renderWeapon}
                    keyExtractor={(item) => item.catalog_id}
                    numColumns={2}
                    scrollEnabled={true}
                    contentContainerStyle={styles.weaponsGrid}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing['2xl'] }}>
                    <AppText variant="bodyLarge" color="secondary" style={{ textAlign: 'center' }}>
                        {catalog.length === 0 ? "No weapons available" : "No weapons in this category"}
                    </AppText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.lg,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorCard: {
        backgroundColor: colors.danger,
        marginBottom: spacing.lg,
    },
    categoryScroll: {
        marginBottom: spacing.lg,
    },
    categoryChip: {
        marginRight: spacing.sm,
    },
    weaponsGrid: {
        paddingBottom: 100,
    },
    weaponCard: {
        flex: 1,
        margin: spacing.sm,
        backgroundColor: colors.bgElevated,
        borderWidth: 2,
    },
    weaponHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    weaponStats: {
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    weaponFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
