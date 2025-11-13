import React, { useEffect } from "react";
import { StyleSheet, ScrollView, TextInput } from "react-native";
import {
    ActivityIndicator,
    SegmentedButtons,
    Chip,
} from "react-native-paper";
import { useExchangeStore, TokenType } from "@/lib/stores/exchangeStore";
import { AppText, AppButton, AppCard, AppScreen, Row, Column } from '@/components/ui';
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
        <AppScreen>
            <ScrollView>
                <Column gap="xl" style={styles.content}>
                    <AppText variant="h2">Token Exchange</AppText>
                    <AppText variant="bodyLarge" color="secondary" style={{ lineHeight: 22 }}>
                        Exchange tokens with predatory NPC rates. Prices update in real-time.
                    </AppText>

                    {error && (
                        <AppCard padding style={{ backgroundColor: colors.danger }}>
                            <Column gap="sm">
                                <AppText variant="body" color="inverse">{error}</AppText>
                                <AppButton variant="primary" size="sm" onPress={clearError}>Dismiss</AppButton>
                            </Column>
                        </AppCard>
                    )}

                    {/* Current Prices Section */}
                    {prices && (
                        <AppCard padding bordered>
                            <Column gap="lg">
                                <AppText variant="h4">Current Prices & Spreads</AppText>
                                <Row justify="space-between" wrap gap="md">
                                    {Object.entries(prices).map(([key, entry]) => (
                                        <AppCard key={key} padding bordered style={styles.priceItem}>
                                            <Column gap="xs">
                                                <AppText variant="bodyBold" color="accent">
                                                    {key.toUpperCase()}
                                                </AppText>
                                                <AppText variant="small" color="secondary">
                                                    {entry.ratio.tokenUnits} : {entry.ratio.usdcUnits}
                                                </AppText>
                                                <Chip
                                                    style={styles.spreadChip}
                                                    textStyle={styles.spreadText}
                                                >
                                                    {formatSpread(entry.spread)} spread
                                                </Chip>
                                            </Column>
                                        </AppCard>
                                    ))}
                                </Row>
                            </Column>
                        </AppCard>
                    )}

                    {/* Exchange Input Section */}
                    <AppCard padding bordered>
                        <Column gap="xl">
                            <AppText variant="h4">Exchange Tokens</AppText>

                            {/* From Token Selection */}
                            <Column gap="sm">
                                <AppText variant="bodyBold">From</AppText>
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
                            </Column>

                            {/* Amount Input */}
                            <Column gap="sm">
                                <AppText variant="bodyBold">Amount</AppText>
                                <TextInput
                                    style={styles.amountInput}
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholder="Enter amount"
                                    placeholderTextColor={colors.textTertiary}
                                    keyboardType="numeric"
                                    editable={!loading}
                                />
                            </Column>

                            {/* To Token Selection */}
                            <Column gap="sm">
                                <AppText variant="bodyBold">To</AppText>
                                <SegmentedButtons
                                    value={toToken}
                                    onValueChange={(value) => setToToken(value as TokenType)}
                                    buttons={TOKEN_OPTIONS.map((opt) => ({
                                        value: opt.value,
                                        label: opt.label,
                                    }))}
                                    style={styles.segmentedButtons}
                                />
                            </Column>

                            {/* Exchange Rate & Output */}
                            {calculatedOutput !== null && (
                                <AppCard padding bordered style={{ borderColor: colors.accent }}>
                                    <Column gap="sm">
                                        <Row justify="space-between" align="center">
                                            <AppText variant="body" color="secondary">
                                                You will receive:
                                            </AppText>
                                            <AppText variant="h3" color="accent">
                                                {formatAmount(calculatedOutput)}{" "}
                                                {toToken.toUpperCase()}
                                            </AppText>
                                        </Row>
                                        {rate !== null && (
                                            <Row justify="space-between" align="center">
                                                <AppText variant="small" color="tertiary">
                                                    Exchange Rate:
                                                </AppText>
                                                <AppText variant="small" color="secondary" style={{ fontFamily: 'monospace' }}>
                                                    {formatRate(rate)}{" "}
                                                    {toToken.toUpperCase()} /{" "}
                                                    {fromToken.toUpperCase()}
                                                </AppText>
                                            </Row>
                                        )}
                                    </Column>
                                </AppCard>
                            )}

                            {loading && (
                                <Row align="center" justify="center" gap="sm">
                                    <ActivityIndicator size="small" color={colors.accent} />
                                    <AppText variant="caption" color="secondary">Calculating...</AppText>
                                </Row>
                            )}

                            {!amount || parseFloat(amount) <= 0 ? (
                                <AppText variant="small" color="tertiary" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                                    Enter an amount to see the exchange rate
                                </AppText>
                            ) : null}
                        </Column>
                    </AppCard>
                </Column>
            </ScrollView>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: spacing.lg,
        maxWidth: 600,
        width: "100%",
        alignSelf: "center",
    },
    priceItem: {
        width: "48%",
    },
    spreadChip: {
        marginTop: spacing.xs,
        backgroundColor: colors.bgElevated,
    },
    spreadText: {
        color: colors.textPrimary,
        fontSize: 10,
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
    },
});

