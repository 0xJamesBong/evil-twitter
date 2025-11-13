import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

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
                <AppText variant="h4">⚔️ My Arsenal</AppText>
                <AppText variant="body" color="secondary" style={{ textAlign: 'center', padding: spacing.xl }}>Loading weapons...</AppText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AppText variant="h4">⚔️ My Arsenal ({weapons.length})</AppText>

            {displayWeapons.length > 0 ? (
                <ScrollView style={styles.weaponsList} showsVerticalScrollIndicator={false}>
                    {displayWeapons.map((weapon) => (
                        <View key={weapon._id.$oid} style={styles.weaponItem}>
                            <AppText variant="body" style={{ fontSize: 24 }}>{weapon.image_url}</AppText>
                            <View style={styles.weaponInfo}>
                                <AppText variant="bodyBold">{weapon.name}</AppText>
                                <AppText variant="small" color="secondary" numberOfLines={2} style={{ marginBottom: spacing.xs }}>
                                    {weapon.description}
                                </AppText>
                                <View style={styles.weaponStats}>
                                    <AppText variant="small" color="tertiary">
                                        Type: {weapon.tool_type === 'Weapon' ? 'Attack' : 'Support'}
                                    </AppText>
                                    <AppText variant="small" color="tertiary">Impact: {weapon.impact}</AppText>
                                    <AppText variant="small" color="tertiary">Durability: {weapon.health}/{weapon.max_health}</AppText>
                                    <AppText variant="small" color="tertiary">Degrade/use: {weapon.degrade_per_use}</AppText>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.emptyState}>
                    <AppText variant="bodyLarge" color="secondary">No weapons yet</AppText>
                    <AppText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>Visit the shop to buy some weapons!</AppText>
                </View>
            )}

            {maxDisplay && weapons.length > maxDisplay && (
                <AppButton variant="ghost" size="sm" onPress={() => { }} style={{ marginTop: spacing.md }}>
                    Show all weapons
                </AppButton>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bgElevated,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    weaponsList: {
        maxHeight: 300,
    },
    weaponItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    weaponInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    weaponStats: {
        flexDirection: 'row',
        gap: spacing.md,
        flexWrap: 'wrap',
    },
    emptyState: {
        alignItems: 'center',
        padding: spacing.xl,
        gap: spacing.sm,
    },
});
