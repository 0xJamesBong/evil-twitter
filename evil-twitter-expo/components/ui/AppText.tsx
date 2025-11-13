import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography, TypographyVariant } from '@/theme';

export interface AppTextProps extends TextProps {
    variant?: TypographyVariant;
    color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'inverse';
}

/**
 * Text component with typography variants and semantic colors
 * 
 * @example
 * <AppText variant="h1">Heading</AppText>
 * <AppText variant="body" color="secondary">Body text</AppText>
 */
export function AppText({
    variant = 'body',
    color = 'primary',
    style,
    ...rest
}: AppTextProps) {
    const colorStyle = colorStyles[color];

    return (
        <Text
            {...rest}
            style={[typography[variant], colorStyle, style]}
        />
    );
}

const colorStyles = StyleSheet.create({
    primary: {
        color: colors.textPrimary,
    },
    secondary: {
        color: colors.textSecondary,
    },
    tertiary: {
        color: colors.textTertiary,
    },
    accent: {
        color: colors.accent,
    },
    danger: {
        color: colors.danger,
    },
    success: {
        color: colors.success,
    },
    inverse: {
        color: colors.textInverse,
    },
});

