import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FollowButton } from '@/components/FollowButton';
import { FollowUser } from '@/lib/stores/followStore';

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
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {user.display_name || user.username || 'User'}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{user.username || 'user'}
        </Text>
        {showBio && user.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#16181c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3336',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#293038',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  username: {
    color: '#71767b',
    fontSize: 13,
  },
  bio: {
    color: '#9ba2ab',
    fontSize: 12,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default FollowListItem;
