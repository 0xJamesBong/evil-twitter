import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView, TextInput } from "react-native";
import {
    Card,
    Text,
    Button,
    ActivityIndicator,
    SegmentedButtons,
    Chip,
} from "react-native-paper";
import { useExchangeStore, TokenType } from "@/lib/stores/exchangeStore";

const TOKEN_OPTIONS: { label: string; value: TokenType }[] = [
    { label: "DOOLER", value: "Dooler" },
    { label: "USDC", value: "Usdc" },
    { label: "SOL", value: "Sol" },
    { label: "BLING", value: "Bling" },
];

export default function ExchangeScreen() {
    const {
        prices,
        loading,
        error,
        fromToken,
        toToken,
        amount,
        calculatedOutput,
        rate,
        fetchPrices,
        setFromToken,
        setToToken,
        setAmount,
        clearError,
    } = useExchangeStore();

    useEffect(() => {
        if (!prices) {
            fetchPrices();
        }
    }, [prices, fetchPrices]);

    const formatAmount = (value: number | null): string => {
        if (value === null) return "—";
        if (value === 0) return "0";
        // Format large numbers with commas
        return value.toLocaleString("en-US", {
            maximumFractionDigits: 6,
            minimumFractionDigits: 0,
        });
    };

    const formatRate = (value: number | null): string => {
        if (value === null) return "—";
        return value.toFixed(6);
    };

    const formatSpread = (spread: number): string => {
        return `${(spread * 100).toFixed(1)}%`;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Token Exchange</Text>
                <Text style={styles.description}>
                    Exchange tokens with predatory NPC rates. Prices update in real-time.
                </Text>

                {error && (
                    <Card style={styles.errorCard}>
                        <Card.Content>
                            <Text style={styles.errorText}>{error}</Text>
                            <Button onPress={clearError} mode="text">
                                Dismiss
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {/* Current Prices Section */}
                {prices && (
                    <Card style={styles.pricesCard}>
                        <Card.Content>
                            <Text style={styles.sectionTitle}>Current Prices & Spreads</Text>
                            <View style={styles.pricesGrid}>
                                {Object.entries(prices).map(([key, entry]) => (
                                    <View key={key} style={styles.priceItem}>
                                        <Text style={styles.priceLabel}>
                                            {key.toUpperCase()}
                                        </Text>
                                        <Text style={styles.priceRatio}>
                                            {entry.ratio.tokenUnits} : {entry.ratio.usdcUnits}
                                        </Text>
                                        <Chip
                                            style={styles.spreadChip}
                                            textStyle={styles.spreadText}
                                        >
                                            {formatSpread(entry.spread)} spread
                                        </Chip>
                                    </View>
                                ))}
                            </View>
                        </Card.Content>
                    </Card>
                )}

                {/* Exchange Input Section */}
                <Card style={styles.exchangeCard}>
                    <Card.Content>
                        <Text style={styles.sectionTitle}>Exchange Tokens</Text>

                        {/* From Token Selection */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>From</Text>
                            <SegmentedButtons
                                value={fromToken}
                                onValueChange={(value) =>
                                    setFromToken(value as TokenType)
                                }
                                buttons={TOKEN_OPTIONS.map((opt) => ({
                                    value: opt.value,
                                    label: opt.label,
                                }))}
                                style={styles.segmentedButtons}
                            />
                        </View>

                        {/* Amount Input */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>Amount</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="Enter amount"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                editable={!loading}
                            />
                        </View>

                        {/* To Token Selection */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>To</Text>
                            <SegmentedButtons
                                value={toToken}
                                onValueChange={(value) => setToToken(value as TokenType)}
                                buttons={TOKEN_OPTIONS.map((opt) => ({
                                    value: opt.value,
                                    label: opt.label,
                                }))}
                                style={styles.segmentedButtons}
                            />
                        </View>

                        {/* Exchange Rate & Output */}
                        {calculatedOutput !== null && (
                            <Card style={styles.resultCard}>
                                <Card.Content>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>You will receive:</Text>
                                        <Text style={styles.resultAmount}>
                                            {formatAmount(calculatedOutput)}
                                        </Text>
                                    </View>
                                    {rate !== null && (
                                        <View style={styles.resultRow}>
                                            <Text style={styles.rateLabel}>Exchange Rate:</Text>
                                            <Text style={styles.rateValue}>{formatRate(rate)}</Text>
                                        </View>
                                    )}
                                </Card.Content>
                            </Card>
                        )}

                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" />
                                <Text style={styles.loadingText}>Calculating...</Text>
                            </View>
                        )}

                        {!amount || parseFloat(amount) <= 0 ? (
                            <Text style={styles.hintText}>
                                Enter an amount to see the exchange rate
                            </Text>
                        ) : null}
                    </Card.Content>
                </Card>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    content: {
        padding: 16,
        maxWidth: 600,
        width: "100%",
        alignSelf: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
    },
    description: {
        color: "#888",
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 22,
    },
    pricesCard: {
        backgroundColor: "#1a1a1a",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#333",
    },
    exchangeCard: {
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: "#333",
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 16,
    },
    pricesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    priceItem: {
        width: "48%",
        marginBottom: 12,
        padding: 12,
        backgroundColor: "#0f0f0f",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#333",
    },
    priceLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1DA1F2",
        marginBottom: 4,
    },
    priceRatio: {
        fontSize: 12,
        color: "#ccc",
        marginBottom: 4,
    },
    spreadChip: {
        marginTop: 4,
        backgroundColor: "#333",
    },
    spreadText: {
        color: "#fff",
        fontSize: 10,
    },
    inputSection: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 8,
    },
    segmentedButtons: {
        backgroundColor: "#0f0f0f",
    },
    amountInput: {
        backgroundColor: "#0f0f0f",
        borderWidth: 1,
        borderColor: "#333",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#fff",
        marginTop: 8,
    },
    resultCard: {
        backgroundColor: "#0f0f0f",
        borderWidth: 1,
        borderColor: "#1DA1F2",
        marginTop: 16,
        marginBottom: 16,
    },
    resultRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: 16,
        color: "#ccc",
    },
    resultAmount: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1DA1F2",
    },
    rateLabel: {
        fontSize: 14,
        color: "#888",
    },
    rateValue: {
        fontSize: 14,
        color: "#ccc",
        fontFamily: "monospace",
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 16,
    },
    loadingText: {
        marginLeft: 8,
        color: "#888",
    },
    hintText: {
        color: "#666",
        fontSize: 14,
        textAlign: "center",
        marginTop: 16,
        fontStyle: "italic",
    },
    errorCard: {
        backgroundColor: "#ff4444",
        marginBottom: 16,
    },
    errorText: {
        color: "#fff",
        marginBottom: 8,
    },
});

