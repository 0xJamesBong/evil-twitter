import React, { useEffect } from "react";
import { StyleSheet, View, ScrollView, TextInput } from "react-native";
import {
    Card,
    Button,
    ActivityIndicator,
    SegmentedButtons,
    Chip,
} from "react-native-paper";
import { useExchangeStore, TokenType } from "@/lib/stores/exchangeStore";
import { AppText, AppButton } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

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
                <AppText variant="h2" style={{ marginBottom: spacing.sm }}>Token Exchange</AppText>
                <AppText variant="bodyLarge" color="secondary" style={{ marginBottom: spacing.xl, lineHeight: 22 }}>
                    Exchange tokens with predatory NPC rates. Prices update in real-time.
                </AppText>

                {error && (
                    <Card style={styles.errorCard}>
                        <Card.Content>
                            <AppText variant="body" color="inverse" style={{ marginBottom: spacing.sm }}>{error}</AppText>
                            <AppButton variant="primary" size="sm" onPress={clearError}>Dismiss</AppButton>
                        </Card.Content>
                    </Card>
                )}

                {/* Current Prices Section */}
                {prices && (
                    <Card style={styles.pricesCard}>
                        <Card.Content>
                            <AppText variant="h4" style={{ marginBottom: spacing.lg }}>Current Prices & Spreads</AppText>
                            <View style={styles.pricesGrid}>
                                {Object.entries(prices).map(([key, entry]) => (
                                    <View key={key} style={styles.priceItem}>
                                        <AppText variant="bodyBold" color="accent" style={{ marginBottom: spacing.xs }}>
                                            {key.toUpperCase()}
                                        </AppText>
                                        <AppText variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
                                            {entry.ratio.tokenUnits} : {entry.ratio.usdcUnits}
                                        </AppText>
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
                        <AppText variant="h4" style={{ marginBottom: spacing.lg }}>Exchange Tokens</AppText>

                        {/* From Token Selection */}
                        <View style={styles.inputSection}>
                            <AppText variant="bodyBold" style={{ marginBottom: spacing.sm }}>From</AppText>
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
                            <AppText variant="bodyBold" style={{ marginBottom: spacing.sm }}>Amount</AppText>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="Enter amount"
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="numeric"
                                editable={!loading}
                            />
                        </View>

                        {/* To Token Selection */}
                        <View style={styles.inputSection}>
                            <AppText variant="bodyBold" style={{ marginBottom: spacing.sm }}>To</AppText>
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
                                        <AppText variant="body" color="secondary">
                                            You will receive:
                                        </AppText>
                                        <AppText variant="h3" color="accent">
                                            {formatAmount(calculatedOutput)}{" "}
                                            {toToken.toUpperCase()}
                                        </AppText>
                                    </View>
                                    {rate !== null && (
                                        <View style={styles.resultRow}>
                                            <AppText variant="small" color="tertiary">
                                                Exchange Rate:
                                            </AppText>
                                            <AppText variant="small" color="secondary" style={{ fontFamily: 'monospace' }}>
                                                {formatRate(rate)}{" "}
                                                {toToken.toUpperCase()} /{" "}
                                                {fromToken.toUpperCase()}
                                            </AppText>
                                        </View>
                                    )}
                                </Card.Content>
                            </Card>
                        )}

                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={colors.accent} />
                                <AppText variant="caption" color="secondary" style={{ marginLeft: spacing.sm }}>Calculating...</AppText>
                            </View>
                        )}

                        {!amount || parseFloat(amount) <= 0 ? (
                            <AppText variant="small" color="tertiary" style={{ textAlign: 'center', marginTop: spacing.lg, fontStyle: 'italic' }}>
                                Enter an amount to see the exchange rate
                            </AppText>
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
        backgroundColor: colors.bg,
    },
    content: {
        padding: spacing.lg,
        maxWidth: 600,
        width: "100%",
        alignSelf: "center",
    },
    pricesCard: {
        backgroundColor: colors.bgElevated,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exchangeCard: {
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pricesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    priceItem: {
        width: "48%",
        marginBottom: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.bgSubtle,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    spreadChip: {
        marginTop: spacing.xs,
        backgroundColor: colors.bgElevated,
    },
    spreadText: {
        color: colors.textPrimary,
        fontSize: 10,
    },
    inputSection: {
        marginBottom: spacing.xl,
    },
    segmentedButtons: {
        backgroundColor: colors.bgSubtle,
    },
    amountInput: {
        backgroundColor: colors.bgSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        padding: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        marginTop: spacing.sm,
    },
    resultCard: {
        backgroundColor: colors.bgSubtle,
        borderWidth: 1,
        borderColor: colors.accent,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
    },
    resultRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    loadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: spacing.lg,
    },
    errorCard: {
        backgroundColor: colors.danger,
        marginBottom: spacing.lg,
    },
});

