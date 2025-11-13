import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, spacing, radii, shadows } from '@/theme';

export interface AppCardProps extends ViewProps {
    children: ReactNode;
    padding?: boolean;
    elevated?: boolean;
    bordered?: boolean;
}

/**
 * Card component for elevated content containers
 * 
 * @example
 * <AppCard padding elevated>
 *   <AppText>Card content</AppText>
 * </AppCard>
 */
export function AppCard({
    children,
    padding = true,
    elevated = false,
    bordered = true,
    style,
    ...rest
}: AppCardProps) {
    return (
        <View
            style={[
                styles.base,
                padding && styles.padding,
                elevated && shadows.md,
                bordered && styles.bordered,
                style,
            ]}
            {...rest}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: colors.bgElevated,
        borderRadius: radii.lg,
    },
    padding: {
        padding: spacing.lg,
    },
    bordered: {
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
});

