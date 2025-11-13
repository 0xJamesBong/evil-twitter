import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { spacing, SpacingKey } from '@/theme';

export interface ColumnProps extends ViewProps {
    children: ReactNode;
    gap?: SpacingKey;
    align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
}

/**
 * Vertical flex container (column)
 * 
 * @example
 * <Column gap="lg" align="stretch">
 *   <AppText>Item 1</AppText>
 *   <AppText>Item 2</AppText>
 * </Column>
 */
export function Column({
    children,
    gap,
    align = 'stretch',
    justify = 'flex-start',
    style,
    ...rest
}: ColumnProps) {
    return (
        <View
            style={[
                styles.base,
                { alignItems: align, justifyContent: justify },
                gap && { gap: spacing[gap] },
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
        flexDirection: 'column',
    },
});

