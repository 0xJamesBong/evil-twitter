import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { spacing, SpacingKey } from '@/theme';

export interface RowProps extends ViewProps {
    children: ReactNode;
    gap?: SpacingKey;
    align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    wrap?: boolean;
}

/**
 * Horizontal flex container (row)
 * 
 * @example
 * <Row gap="md" align="center" justify="space-between">
 *   <AppText>Left</AppText>
 *   <AppText>Right</AppText>
 * </Row>
 */
export function Row({
    children,
    gap,
    align = 'flex-start',
    justify = 'flex-start',
    wrap = false,
    style,
    ...rest
}: RowProps) {
    return (
        <View
            style={[
                styles.base,
                { alignItems: align, justifyContent: justify },
                gap && { gap: spacing[gap] },
                wrap && styles.wrap,
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
        flexDirection: 'row',
    },
    wrap: {
        flexWrap: 'wrap',
    },
});

