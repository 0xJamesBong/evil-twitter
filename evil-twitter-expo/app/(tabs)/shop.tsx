import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList, ScrollView } from 'react-native';
import { Card, Text, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { useBackendUserStore } from '@/lib/stores/backendUserStore';
import { useShopStore } from '@/lib/stores/shopStore';

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

    const renderWeapon = ({ item }: { item: any }) => (
        <Card style={[styles.weaponCard, { borderColor: getRarityColor(item.rarity) }]}>
            <Card.Content>
                <View style={styles.weaponHeader}>
                    <Text style={styles.weaponEmoji}>{item.emoji}</Text>
                    <Chip
                        mode="outlined"
                        textStyle={{ color: getRarityColor(item.rarity), fontSize: 10 }}
                        style={{ borderColor: getRarityColor(item.rarity) }}
                    >
                        {item.rarity.toUpperCase()}
                    </Chip>
                </View>

                <Text style={styles.weaponName}>{item.name}</Text>
                <Text style={styles.weaponDescription}>{item.description}</Text>

                <View style={styles.weaponStats}>
                    <Text style={styles.statText}>Health: {item.max_health}</Text>
                    {item.attack_power > 0 && (
                        <Text style={styles.statText}>Attack: {item.attack_power}</Text>
                    )}
                    {item.heal_power > 0 && (
                        <Text style={styles.statText}>Heal: {item.heal_power}</Text>
                    )}
                </View>

                <View style={styles.weaponFooter}>
                    <Text style={styles.price}>${item.price}</Text>
                    <Button
                        mode="contained"
                        onPress={() => handleBuyWeapon(item.id)}
                        disabled={buying === item.id || !user}
                        loading={buying === item.id}
                        compact
                    >
                        Buy
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );

    if (loading) {
        return (
            <View style={styles.content}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>Loading weapons...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.content}>
            <Text style={styles.description}>
                Select from our arsenal of powerful weapons, defensive gear, healing items, and utility gadgets.
                Each item has unique stats and abilities to enhance your Twitter battles.
            </Text>

            {error && (
                <Card style={styles.errorCard}>
                    <Card.Content>
                        <Text style={styles.errorText}>{error}</Text>
                        <Button onPress={clearError}>Dismiss</Button>
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
            <FlatList
                data={filteredCatalog}
                renderItem={renderWeapon}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.weaponsGrid}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 16,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    // Mobile layout styles (kept for compatibility)
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: '#fff',
    },
    description: {
        color: '#888',
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 22,
    },
    errorCard: {
        backgroundColor: '#ff4444',
        marginBottom: 16,
    },
    errorText: {
        color: '#fff',
        marginBottom: 8,
    },
    categoryScroll: {
        marginBottom: 16,
    },
    categoryChip: {
        marginRight: 8,
    },
    weaponsGrid: {
        paddingBottom: 100,
    },
    weaponCard: {
        flex: 1,
        margin: 8,
        backgroundColor: '#1a1a1a',
        borderWidth: 2,
    },
    weaponHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    weaponEmoji: {
        fontSize: 48,
    },
    weaponName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    weaponDescription: {
        color: '#888',
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    weaponStats: {
        marginBottom: 16,
    },
    statText: {
        color: '#ccc',
        fontSize: 12,
        marginBottom: 2,
    },
    weaponFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1DA1F2',
    },
});
