import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeaponsPanelProps {
    userId: string;
    maxDisplay: number;
}

export const WeaponsPanel: React.FC<WeaponsPanelProps> = ({ userId, maxDisplay }) => {
    // Mock data for weapons
    const weapons = [
        { id: '1', name: "Rowling's Snare", emoji: '🔫', durability: '90/100', impact: 50 },
        { id: '2', name: "Sauron's Ring", emoji: '💍', durability: '75/100', impact: 100 },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Arsenal ({weapons.length})</Text>
            {weapons.slice(0, maxDisplay).map((weapon) => (
                <View key={weapon.id} style={styles.weapon}>
                    <Text style={styles.emoji}>{weapon.emoji}</Text>
                    <View style={styles.details}>
                        <Text style={styles.name}>{weapon.name}</Text>
                        <Text style={styles.stats}>Impact: {weapon.impact} | Durability: {weapon.durability}</Text>
                    </View>
                </View>
            ))}
            <Text style={styles.showAll}>Show all weapons</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 8,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    weapon: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    emoji: {
        fontSize: 24,
        marginRight: 8,
    },
    details: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    stats: {
        color: '#aaa',
        fontSize: 12,
    },
    showAll: {
        color: '#1DA1F2',
        fontSize: 14,
        marginTop: 8,
    },
});
