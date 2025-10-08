import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const navigation = [
  { name: 'Home', icon: '🏠' },
  { name: 'Explore', icon: '🔍' },
  { name: 'Notifications', icon: '🔔' },
  { name: 'Messages', icon: '✉️' },
  { name: 'Bookmarks', icon: '🔖' },
  { name: 'Profile', icon: '👤' },
  { name: 'Shop', icon: '🛒' },
];

const tweets = Array.from({ length: 12 }).map((_, index) => ({
  id: `tweet-${index}`,
  author: index % 2 === 0 ? 'Evil Genius' : 'Chaos Agent',
  handle: index % 2 === 0 ? 'evilgenius' : 'chaosagent',
  time: `${index + 1}h`,
  content:
    index % 2 === 0
      ? 'Just deployed a brand new curse into production. Works like a charm.'
      : 'Plot twist: the villain was unit tests failing all along.',
}));

const trends = [
  { label: 'Trending in Villainy', topic: 'World Domination', volume: '120K' },
  { label: 'Trending in Tech', topic: 'Diabolical AI', volume: '89K' },
  { label: 'Trending Near You', topic: 'Secret Lairs', volume: '54K' },
  { label: 'Trending in Entertainment', topic: 'Hero Downfalls', volume: '33K' },
];

export default function App() {
  const { width } = useWindowDimensions();
  const showRightSidebar = width >= 1200;
  const isCompactSidebar = width < 1024;
  const isStackedLayout = width < 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.appBackground}>
        <View style={[styles.appShell, isStackedLayout && styles.appShellStacked]}>
          <View
            style={[
              styles.sidebarWrapper,
              isCompactSidebar ? styles.sidebarWrapperCompact : null,
              isStackedLayout ? styles.sidebarWrapperStacked : null,
            ]}
          >
            <Sidebar compact={isCompactSidebar} />
          </View>

          <View
            style={[
              styles.timelineWrapper,
              isStackedLayout ? styles.timelineWrapperStacked : null,
            ]}
          >
            <Timeline />
          </View>

          {showRightSidebar ? (
            <View style={styles.rightSidebarWrapper}>
              <RightSidebar />
            </View>
          ) : null}

          {isStackedLayout && !showRightSidebar ? (
            <View style={styles.mobileRightSidebar}>
              <RightSidebar />
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Sidebar({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.sidebarContainer, compact && styles.sidebarContainerCompact]}>
      <View>
        <Text style={[styles.logo, compact && styles.logoCompact]}>ET</Text>
        {!compact ? (
          <Text style={styles.logoSubtitle}>Evil Twitter</Text>
        ) : null}

        <View style={styles.navList}>
          {navigation.map((item) => (
            <TouchableOpacity key={item.name} style={styles.navItem}>
              <Text style={styles.navIcon}>{item.icon}</Text>
              {!compact ? <Text style={styles.navLabel}>{item.name}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.tweetButton} activeOpacity={0.8}>
          <Text style={styles.tweetButtonText}>{compact ? '✍️' : 'Tweet'}</Text>
        </TouchableOpacity>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>EG</Text>
          </View>
          {!compact ? (
            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>Evil Genius</Text>
              <Text style={styles.profileHandle}>@evilgenius</Text>
            </View>
          ) : null}
          {!compact ? <Text style={styles.profileMenu}>⋯</Text> : null}
        </View>
      </View>
    </View>
  );
}

function Timeline() {
  return (
    <ScrollView
      style={styles.timeline}
      contentContainerStyle={styles.timelineContent}
      showsVerticalScrollIndicator={Platform.select({ web: true, default: false })}
    >
      <View style={styles.composeCard}>
        <View style={styles.composeAvatar}>
          <Text style={styles.composeAvatarText}>EG</Text>
        </View>
        <View style={styles.composeBody}>
          <Text style={styles.composePrompt}>What chaos are we spreading today?</Text>
          <View style={styles.composeActions}>
            <TouchableOpacity style={styles.composeButton}>
              <Text style={styles.composeButtonText}>Compose</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {tweets.map((tweet) => (
        <View key={tweet.id} style={styles.tweetCard}>
          <View style={styles.tweetAvatar}>
            <Text style={styles.tweetAvatarText}>{tweet.author[0]}</Text>
          </View>
          <View style={styles.tweetBody}>
            <View style={styles.tweetHeader}>
              <Text style={styles.tweetAuthor}>{tweet.author}</Text>
              <Text style={styles.tweetHandle}>@{tweet.handle}</Text>
              <Text style={styles.tweetSeparator}>·</Text>
              <Text style={styles.tweetTime}>{tweet.time}</Text>
            </View>
            <Text style={styles.tweetContent}>{tweet.content}</Text>
            <View style={styles.tweetActions}>
              <Text style={styles.tweetAction}>💬 42</Text>
              <Text style={styles.tweetAction}>🔁 66</Text>
              <Text style={styles.tweetAction}>❤️ 420</Text>
              <Text style={styles.tweetAction}>📤</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function RightSidebar() {
  return (
    <View style={styles.rightSidebar}>
      <View style={styles.searchCard}>
        <Text style={styles.searchInput}>Search Evil Twitter</Text>
      </View>

      <View style={styles.trendsCard}>
        <Text style={styles.trendsTitle}>What's happening</Text>
        {trends.map((trend) => (
          <View key={trend.topic} style={styles.trendItem}>
            <Text style={styles.trendLabel}>{trend.label}</Text>
            <Text style={styles.trendTopic}>{trend.topic}</Text>
            <Text style={styles.trendVolume}>{trend.volume} posts</Text>
          </View>
        ))}
      </View>

      <View style={styles.followCard}>
        <Text style={styles.followTitle}>Who to follow</Text>
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.followItem}>
            <View style={styles.followAvatar}>
              <Text style={styles.followAvatarText}>C{index}</Text>
            </View>
            <View style={styles.followMeta}>
              <Text style={styles.followName}>Chaos Maker {index}</Text>
              <Text style={styles.followHandle}>@chaos{index}</Text>
            </View>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  appBackground: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  appShell: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1400,
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ web: 24, default: 16 }),
    gap: 16,
  },
  appShellStacked: {
    flexDirection: 'column',
  },
  sidebarWrapper: {
    width: 280,
    maxWidth: 320,
  },
  sidebarWrapperCompact: {
    width: 88,
  },
  sidebarWrapperStacked: {
    width: '100%',
  },
  sidebarContainer: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  sidebarContainerCompact: {
    paddingHorizontal: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  logoCompact: {
    textAlign: 'center',
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 24,
  },
  navList: {
    gap: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 16,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  sidebarFooter: {
    gap: 20,
  },
  tweetButton: {
    backgroundColor: '#1d9bf0',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tweetButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  profileHandle: {
    color: '#9ca3af',
    marginTop: 2,
  },
  profileMenu: {
    color: '#9ca3af',
    fontSize: 18,
  },
  timelineWrapper: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  timelineWrapperStacked: {
    width: '100%',
    marginTop: 16,
  },
  timeline: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  timelineContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 20,
  },
  composeCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  composeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  composeBody: {
    flex: 1,
    gap: 12,
  },
  composePrompt: {
    color: '#9ca3af',
    fontSize: 16,
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  composeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#1d9bf0',
  },
  composeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tweetCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tweetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tweetAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  tweetBody: {
    flex: 1,
    gap: 12,
  },
  tweetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tweetAuthor: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  tweetHandle: {
    color: '#9ca3af',
  },
  tweetSeparator: {
    color: '#9ca3af',
  },
  tweetTime: {
    color: '#9ca3af',
  },
  tweetContent: {
    color: '#e5e7eb',
    fontSize: 16,
    lineHeight: 22,
  },
  tweetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tweetAction: {
    color: '#9ca3af',
  },
  rightSidebarWrapper: {
    width: 320,
  },
  rightSidebar: {
    gap: 20,
  },
  mobileRightSidebar: {
    marginTop: 16,
    width: '100%',
  },
  searchCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  searchInput: {
    color: '#9ca3af',
  },
  trendsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    gap: 16,
  },
  trendsTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },
  trendItem: {
    gap: 6,
  },
  trendLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trendTopic: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  trendVolume: {
    color: '#9ca3af',
  },
  followCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    gap: 16,
  },
  followTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },
  followItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  followAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followAvatarText: {
    color: '#fff',
    fontWeight: '600',
  },
  followMeta: {
    flex: 1,
  },
  followName: {
    color: '#fff',
    fontWeight: '600',
  },
  followHandle: {
    color: '#9ca3af',
  },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  followButtonText: {
    fontWeight: '600',
  },
});