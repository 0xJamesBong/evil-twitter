import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function FollowButton({ isFollowing, onToggle, compact = false }: FollowButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.buttonCompact,
        isFollowing && styles.following,
      ]}
      activeOpacity={0.8}
      onPress={onToggle}
    >
      <Text style={[styles.label, isFollowing && styles.followingLabel]}>
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1d9bf0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  buttonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  following: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#71767b',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  followingLabel: {
    color: '#71767b',
  },
});

export default FollowButton;
