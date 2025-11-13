import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, typography } from '@/theme';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function FollowButton({ isFollowing, onToggle, compact = false }: FollowButtonProps) {
  const handlePress = () => {
    console.log('FollowButton pressed:', { isFollowing, onToggle: !!onToggle });
    onToggle();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.buttonCompact,
        isFollowing && styles.following,
      ]}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      <Text style={[styles.label, isFollowing && styles.followingLabel]}>
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    minWidth: 80,
  },
  buttonCompact: {
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
  },
  following: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  label: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  followingLabel: {
    color: colors.textSecondary,
  },
});

export default FollowButton;
