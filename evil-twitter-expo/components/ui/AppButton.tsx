import React, { ReactNode } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, typography } from '@/theme';
import { AppText } from './AppText';

export interface AppButtonProps {
    children: ReactNode;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
}

/**
 * Button component with variants and sizes
 * 
 * @example
 * <AppButton variant="primary" onPress={handlePress}>
 *   Click me
 * </AppButton>
 */
export function AppButton({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    style,
}: AppButtonProps) {
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            style={[
                styles.base,
                styles[variant],
                styles[size],
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? colors.textInverse : colors.textPrimary}
                />
            ) : (
                <AppText
                    variant={size === 'sm' ? 'smallBold' : size === 'lg' ? 'bodyBold' : 'captionBold'}
                    color={variant === 'primary' || variant === 'danger' ? 'inverse' : 'primary'}
                    style={styles.text}
                >
                    {children}
                </AppText>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    // Variants
    primary: {
        backgroundColor: colors.accent,
    },
    secondary: {
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: colors.danger,
    },
    // Sizes
    sm: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        minHeight: 32,
    },
    md: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        minHeight: 40,
    },
    lg: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        minHeight: 48,
    },
    // States
    disabled: {
        opacity: 0.5,
    },
    fullWidth: {
        width: '100%',
    },
    text: {
        textAlign: 'center',
    },
});

