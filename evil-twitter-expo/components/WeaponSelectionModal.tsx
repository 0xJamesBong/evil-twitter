import { useWeaponsStore, Weapon } from '@/lib/stores/weaponsStore';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { AppText } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

interface WeaponSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectWeapon: (weaponId: string, weapon: Weapon) => void;
    actionType: 'attack' | 'support';
}

export function WeaponSelectionModal({
    visible,
    onClose,
    onSelectWeapon,
    actionType,
}: WeaponSelectionModalProps) {
    const { weapons, loading } = useWeaponsStore();
    const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);

    const filteredWeapons = weapons.filter((weapon) =>
        actionType === 'attack'
            ? weapon.tool_type === 'Weapon'
            : weapon.tool_type === 'Support'
    );

    const handleSelectWeapon = (weapon: Weapon) => {
        setSelectedWeapon(weapon._id.$oid);
        onSelectWeapon(weapon._id.$oid, weapon);
        onClose();
    };

    const renderWeapon = ({ item }: { item: Weapon }) => (
        <TouchableOpacity
            style={[
                styles.weaponItem,
                selectedWeapon === item._id.$oid && styles.selectedWeapon,
            ]}
            onPress={() => handleSelectWeapon(item)}
        >
            <View style={styles.weaponInfo}>
                <AppText variant="body" style={{ fontSize: 32, marginRight: spacing.lg }}>{item.image_url}</AppText>
                <View style={styles.weaponDetails}>
                    <AppText variant="bodyBold" style={{ marginBottom: spacing.xs }}>{item.name}</AppText>
                    <AppText variant="small" color="secondary" style={{ marginBottom: spacing.sm }}>{item.description}</AppText>
                    <View style={styles.weaponStats}>
                        <AppText variant="small" color="tertiary">
                            Impact: {item.impact}
                        </AppText>
                        <AppText variant="small" color="tertiary">
                            Durability: {item.health}/{item.max_health}
                        </AppText>
                        <AppText variant="small" color="tertiary">
                            Degrade/use: {item.degrade_per_use}
                        </AppText>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <AppText variant="h4" style={{ flex: 1 }}>
                            Select Tool to {actionType === 'attack' ? 'Attack' : 'Support'}
                        </AppText>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppText variant="h4" color="secondary">✕</AppText>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <AppText variant="bodyLarge" color="secondary">Loading weapons...</AppText>
                        </View>
                    ) : filteredWeapons.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <AppText variant="bodyBold" style={{ marginBottom: spacing.sm }}>No tools available</AppText>
                            <AppText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                                Visit the shop to purchase more {actionType === 'attack' ? 'weapons' : 'support tools'}.
                            </AppText>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredWeapons}
                            keyExtractor={(item) => item._id.$oid}
                            renderItem={renderWeapon}
                            style={styles.weaponList}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlayStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: colors.bgElevated,
        borderRadius: radii.lg,
        width: '90%',
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        padding: spacing.sm,
        borderRadius: radii.pill,
        backgroundColor: colors.bgSubtle,
    },
    loadingContainer: {
        padding: spacing['2xl'],
        alignItems: 'center',
    },
    emptyContainer: {
        padding: spacing['2xl'],
        alignItems: 'center',
        gap: spacing.sm,
    },
    weaponList: {
        maxHeight: 400,
    },
    weaponItem: {
        flexDirection: 'row',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.bgElevated,
    },
    selectedWeapon: {
        backgroundColor: colors.bgCardSecondary,
    },
    weaponInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    weaponDetails: {
        flex: 1,
        gap: spacing.xs,
    },
    weaponStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
});
