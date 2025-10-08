import React, { useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';

interface WeaponsPanelProps {
    userId?: string;
    maxDisplay?: number;
}

export function WeaponsPanel({ userId, maxDisplay = 5 }: WeaponsPanelProps) {
    const { weapons, loading, fetchUserWeapons } = useWeaponsStore();

    useEffect(() => {
        if (userId) {
            fetchUserWeapons(userId);
        }
    }, [userId, fetchUserWeapons]);

    const displayWeapons = maxDisplay ? weapons.slice(0, maxDisplay) : weapons;

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>⚔️ My Arsenal</Text>
                <Text style={styles.loadingText}>Loading weapons...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>⚔️ My Arsenal ({weapons.length})</Text>

            {displayWeapons.length > 0 ? (
                <ScrollView style={styles.weaponsList} showsVerticalScrollIndicator={false}>
                    {displayWeapons.map((weapon) => (
                        <View key={weapon._id.$oid} style={styles.weaponItem}>
                            <Text style={styles.weaponEmoji}>{weapon.image_url}</Text>
                            <View style={styles.weaponInfo}>
                                <Text style={styles.weaponName}>{weapon.name}</Text>
                                <Text style={styles.weaponDescription} numberOfLines={2}>
                                    {weapon.description}
                                </Text>
                                <View style={styles.weaponStats}>
                                    <Text style={styles.statText}>Health: {weapon.health}/{weapon.max_health}</Text>
                                    <Text style={styles.statText}>Damage: {weapon.damage}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No weapons yet</Text>
                    <Text style={styles.emptySubtext}>Visit the shop to buy some weapons!</Text>
                </View>
            )}

            {maxDisplay && weapons.length > maxDisplay && (
                <TouchableOpacity style={styles.showMoreButton}>
                    <Text style={styles.showMoreText}>Show all weapons</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    loadingText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        padding: 20,
    },
    weaponsList: {
        maxHeight: 300,
    },
    weaponItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    weaponEmoji: {
        fontSize: 24,
    },
    weaponInfo: {
        flex: 1,
    },
    weaponName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    weaponDescription: {
        fontSize: 12,
        color: '#888',
        marginBottom: 6,
        lineHeight: 16,
    },
    weaponStats: {
        flexDirection: 'row',
        gap: 12,
    },
    statText: {
        fontSize: 10,
        color: '#666',
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
    showMoreButton: {
        marginTop: 12,
        paddingVertical: 8,
        alignItems: 'center',
    },
    showMoreText: {
        color: '#1DA1F2',
        fontSize: 14,
    },
});
