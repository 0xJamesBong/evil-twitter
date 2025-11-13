import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export interface AppScreenProps extends ViewProps {
  children: ReactNode;
  safe?: boolean;
  padding?: boolean;
  paddingHorizontal?: boolean;
  paddingVertical?: boolean;
}

/**
 * Base screen component that handles safe area, background, and base padding
 * 
 * @example
 * <AppScreen>
 *   <AppText>Content here</AppText>
 * </AppScreen>
 */
export function AppScreen({
  children,
  safe = true,
  padding = false,
  paddingHorizontal = false,
  paddingVertical = false,
  style,
  ...rest
}: AppScreenProps) {
  const containerStyle = [
    styles.container,
    padding && styles.padding,
    paddingHorizontal && styles.paddingHorizontal,
    paddingVertical && styles.paddingVertical,
    style,
  ];

  if (safe) {
    return (
      <SafeAreaView style={containerStyle} {...rest}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={containerStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  padding: {
    padding: spacing.lg,
  },
  paddingHorizontal: {
    paddingHorizontal: spacing.lg,
  },
  paddingVertical: {
    paddingVertical: spacing.lg,
  },
});

