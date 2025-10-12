import { useWeaponsStore } from '@/lib/stores/weaponsStore';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface WeaponSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectWeapon: (weaponId: string, damage: number, health: number) => void;
    actionType: 'attack' | 'heal';
}

export function WeaponSelectionModal({
    visible,
    onClose,
    onSelectWeapon,
    actionType,
}: WeaponSelectionModalProps) {
    const { weapons, loading } = useWeaponsStore();
    const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);

    const handleSelectWeapon = (weaponId: string, damage: number, health: number) => {
        setSelectedWeapon(weaponId);
        onSelectWeapon(weaponId, damage, health);
        onClose();
    };

    const renderWeapon = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.weaponItem,
                selectedWeapon === item._id.$oid && styles.selectedWeapon,
            ]}
            onPress={() => handleSelectWeapon(item._id.$oid, item.damage, item.health)}
        >
            <View style={styles.weaponInfo}>
                <Text style={styles.weaponEmoji}>{item.image_url}</Text>
                <View style={styles.weaponDetails}>
                    <Text style={styles.weaponName}>{item.name}</Text>
                    <Text style={styles.weaponDescription}>{item.description}</Text>
                    <View style={styles.weaponStats}>
                        <Text style={styles.statText}>
                            {actionType === 'attack' ? 'Damage' : 'Heal'}: {actionType === 'attack' ? item.damage : item.health}
                        </Text>
                        <Text style={styles.statText}>Health: {item.health}/{item.max_health}</Text>
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
                        <Text style={styles.title}>
                            Select Weapon to {actionType === 'attack' ? 'Attack' : 'Heal'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading weapons...</Text>
                        </View>
                    ) : weapons.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No weapons available</Text>
                            <Text style={styles.emptySubtext}>
                                Visit the shop to buy weapons first
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={weapons}
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#333',
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        fontSize: 16,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
    },
    weaponList: {
        maxHeight: 400,
    },
    weaponItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: '#1a1a1a',
    },
    selectedWeapon: {
        backgroundColor: '#2a2a2a',
    },
    weaponInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    weaponEmoji: {
        fontSize: 32,
        marginRight: 16,
    },
    weaponDetails: {
        flex: 1,
    },
    weaponName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    weaponDescription: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
    },
    weaponStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statText: {
        fontSize: 12,
        color: '#666',
    },
});
