import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList, ScrollView } from 'react-native';
import { Chip, ActivityIndicator } from 'react-native-paper';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useShopStore, WeaponCatalogItem } from '@/lib/stores/shopStore';
import { AppText, AppButton, AppCard, AppScreen, Row, Column } from '@/components/ui';
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
            <AppCard
                padding
                bordered
                style={[
                    styles.weaponCard,
                    { borderColor: getRarityColor(rarity), borderWidth: 2 }
                ]}
            >
                <Column gap="sm">
                    <AppText variant="body" style={{ fontSize: 48 }}>{weaponItem?.image_url || '⚔️'}</AppText>

                    <AppText variant="h4">{weaponItem?.name || 'Unknown Weapon'}</AppText>
                    <AppText variant="body" color="secondary">{weaponItem?.description || ''}</AppText>

                    {metadata && (
                        <Column gap="xs">
                            <AppText variant="small" color="tertiary">Type: {metadata.tool_type}</AppText>
                            <AppText variant="small" color="tertiary">Impact: {metadata.impact}</AppText>
                            <AppText variant="small" color="tertiary">Durability: {metadata.health}/{metadata.max_health}</AppText>
                            <AppText variant="small" color="tertiary">Degrade/use: {metadata.degrade_per_use}</AppText>
                        </Column>
                    )}

                    <Row justify="space-between" align="center">
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
                    </Row>
                </Column>
            </AppCard>
        );
    };

    if (loading) {
        return (
            <AppScreen padding>
                <Column justify="center" align="center" style={{ flex: 1 }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <AppText variant="bodyLarge" style={{ marginTop: spacing.lg }}>Loading weapons...</AppText>
                </Column>
            </AppScreen>
        );
    }

    return (
        <AppScreen padding>
            <Column gap="xl" style={{ maxWidth: 600, width: '100%', alignSelf: 'center' }}>
                <AppText variant="bodyLarge" color="secondary" style={{ lineHeight: 22 }}>
                    Select from our arsenal of offensive weapons, defensive gear, support tools, and utility gadgets.
                    Each item has unique stats and abilities to enhance your Twitter battles.
                </AppText>

                {error && (
                    <AppCard padding style={{ backgroundColor: colors.danger }}>
                        <Column gap="sm">
                            <AppText variant="body" color="inverse">{error}</AppText>
                            <AppButton variant="primary" size="sm" onPress={clearError}>Dismiss</AppButton>
                        </Column>
                    </AppCard>
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
                    <Column justify="center" align="center" style={{ flex: 1, paddingVertical: spacing['2xl'] }}>
                        <AppText variant="bodyLarge" color="secondary" style={{ textAlign: 'center' }}>
                            {catalog.length === 0 ? "No weapons available" : "No weapons in this category"}
                        </AppText>
                    </Column>
                )}
            </Column>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
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
    },
});
