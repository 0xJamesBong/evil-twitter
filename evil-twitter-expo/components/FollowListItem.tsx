import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FollowButton } from '@/components/FollowButton';
import { FollowUser } from '@/lib/stores/followStore';
import { AppText } from '@/components/ui';
import { colors, spacing, radii, typography } from '@/theme';

interface FollowListItemProps {
  user: FollowUser;
  onPress?: (user: FollowUser) => void;
  showFollowButton?: boolean;
  isFollowed?: boolean;
  onToggleFollow?: () => void;
  rightContent?: React.ReactNode;
  showBio?: boolean;
}

export function FollowListItem({
  user,
  onPress,
  showFollowButton = false,
  isFollowed = false,
  onToggleFollow,
  rightContent,
  showBio = true,
}: FollowListItemProps) {
  const handlePress = () => {
    onPress?.(user);
  };

  const initials =
    user.display_name?.charAt(0).toUpperCase() ||
    user.username?.charAt(0).toUpperCase() ||
    '😈';

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      style={styles.item}
      onPress={handlePress}
    >
      <View style={styles.avatar}>
        <AppText variant="h4">{initials}</AppText>
      </View>
      <View style={styles.info}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {user.display_name || user.username || 'User'}
        </AppText>
        <AppText variant="caption" color="secondary" numberOfLines={1}>
          @{user.username || 'user'}
        </AppText>
        {showBio && user.bio ? (
          <AppText variant="small" color="secondary" numberOfLines={2}>
            {user.bio}
          </AppText>
        ) : null}
      </View>
      {rightContent ? (
        <View style={styles.rightContent}>{rightContent}</View>
      ) : showFollowButton && onToggleFollow ? (
        <FollowButton
          isFollowing={isFollowed ?? false}
          onToggle={onToggleFollow}
          compact
        />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  username: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bio: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default FollowListItem;
