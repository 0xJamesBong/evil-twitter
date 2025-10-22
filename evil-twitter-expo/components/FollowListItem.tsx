import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FollowUser } from '@/lib/stores/followStore';

interface FollowListItemProps {
  user: FollowUser;
  onPress?: (user: FollowUser) => void;
  showFollowButton?: boolean;
  isFollowed?: boolean;
  followBusy?: boolean;
  onToggleFollow?: (user: FollowUser) => void;
  rightContent?: ReactNode;
  showBio?: boolean;
}

export function FollowListItem({
  user,
  onPress,
  showFollowButton = false,
  isFollowed = false,
  followBusy = false,
  onToggleFollow,
  rightContent,
  showBio = true,
}: FollowListItemProps) {
  const initials =
    user.display_name?.charAt(0).toUpperCase() ??
    user.username?.charAt(0).toUpperCase() ??
    '😈';

  const handlePress = () => {
    onPress?.(user);
  };

  const handleToggleFollow = () => {
    if (!followBusy && onToggleFollow) {
      onToggleFollow(user);
    }
  };

  const trailing = rightContent
    ? <View style={styles.rightContent}>{rightContent}</View>
    : showFollowButton ? (
        <TouchableOpacity
          style={[styles.followButton, isFollowed && styles.followingButton, followBusy && styles.followButtonDisabled]}
          onPress={handleToggleFollow}
          disabled={followBusy}
        >
          <Text
            style={[
              styles.followButtonText,
              isFollowed && styles.followingButtonText,
            ]}
          >
            {isFollowed ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      ) : null;

  return (
    <TouchableOpacity style={styles.item} onPress={handlePress} activeOpacity={onPress ? 0.8 : 1}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.displayName}>
          {user.display_name || user.username || 'User'}
        </Text>
        <Text style={styles.username}>@{user.username || 'user'}</Text>
        {showBio && user.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        ) : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#293038',
    justifyContent: 'center',
    alignItems: 'center',
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
  followButton: {
    backgroundColor: '#1d9bf0',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#71767b',
  },
  followingButtonText: {
    color: '#71767b',
  },
});
