import { API_BASE_URL } from "@/lib/services/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, useColorScheme, useWindowDimensions, View } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const showRightSidebar = width >= 1200;
  const isCompactSidebar = width < 1024;
  const isStackedLayout = width < 768;

  console.log("API_BASE_URL: ", API_BASE_URL);
  useEffect(() => {
    initialize();
  }, [initialize]);

  const navTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const paperTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
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
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                </Stack>
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
      </ThemeProvider>
    </PaperProvider>
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
  rightSidebarWrapper: {
    width: 320,
  },
  mobileRightSidebar: {
    marginTop: 16,
    width: '100%',
  },
});

// Sidebar Component
function Sidebar({ compact }: { compact: boolean }) {
  const navigation = [
    { name: 'Home', icon: '🏠' },
    { name: 'Explore', icon: '🔍' },
    { name: 'Notifications', icon: '🔔' },
    { name: 'Messages', icon: '✉️' },
    { name: 'Bookmarks', icon: '🔖' },
    { name: 'Profile', icon: '👤' },
    { name: 'Shop', icon: '🛒' },
  ];

  return (
    <View style={[sidebarStyles.sidebarContainer, compact && sidebarStyles.sidebarContainerCompact]}>
      <View>
        <Text style={[sidebarStyles.logo, compact && sidebarStyles.logoCompact]}>ET</Text>
        {!compact ? (
          <Text style={sidebarStyles.logoSubtitle}>Evil Twitter</Text>
        ) : null}

        <View style={sidebarStyles.navList}>
          {navigation.map((item) => (
            <TouchableOpacity key={item.name} style={sidebarStyles.navItem}>
              <Text style={sidebarStyles.navIcon}>{item.icon}</Text>
              {!compact ? <Text style={sidebarStyles.navLabel}>{item.name}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={sidebarStyles.sidebarFooter}>
        <TouchableOpacity style={sidebarStyles.tweetButton} activeOpacity={0.8}>
          <Text style={sidebarStyles.tweetButtonText}>{compact ? '✍️' : 'Tweet'}</Text>
        </TouchableOpacity>

        <View style={sidebarStyles.profileCard}>
          <View style={sidebarStyles.profileAvatar}>
            <Text style={sidebarStyles.profileAvatarText}>EG</Text>
          </View>
          {!compact ? (
            <View style={sidebarStyles.profileMeta}>
              <Text style={sidebarStyles.profileName}>Evil Genius</Text>
              <Text style={sidebarStyles.profileHandle}>@evilgenius</Text>
            </View>
          ) : null}
          {!compact ? <Text style={sidebarStyles.profileMenu}>⋯</Text> : null}
        </View>
      </View>
    </View>
  );
}

// RightSidebar Component
function RightSidebar() {
  const trends = [
    { label: 'Trending in Villainy', topic: 'World Domination', volume: '120K' },
    { label: 'Trending in Tech', topic: 'Diabolical AI', volume: '89K' },
    { label: 'Trending Near You', topic: 'Secret Lairs', volume: '54K' },
    { label: 'Trending in Entertainment', topic: 'Hero Downfalls', volume: '33K' },
  ];

  return (
    <View style={rightSidebarStyles.rightSidebar}>
      <View style={rightSidebarStyles.searchCard}>
        <Text style={rightSidebarStyles.searchInput}>Search Evil Twitter</Text>
      </View>

      <View style={rightSidebarStyles.trendsCard}>
        <Text style={rightSidebarStyles.trendsTitle}>What's happening</Text>
        {trends.map((trend) => (
          <View key={trend.topic} style={rightSidebarStyles.trendItem}>
            <Text style={rightSidebarStyles.trendLabel}>{trend.label}</Text>
            <Text style={rightSidebarStyles.trendTopic}>{trend.topic}</Text>
            <Text style={rightSidebarStyles.trendVolume}>{trend.volume} posts</Text>
          </View>
        ))}
      </View>

      <View style={rightSidebarStyles.followCard}>
        <Text style={rightSidebarStyles.followTitle}>Who to follow</Text>
        {[1, 2, 3].map((index) => (
          <View key={index} style={rightSidebarStyles.followItem}>
            <View style={rightSidebarStyles.followAvatar}>
              <Text style={rightSidebarStyles.followAvatarText}>C{index}</Text>
            </View>
            <View style={rightSidebarStyles.followMeta}>
              <Text style={rightSidebarStyles.followName}>Chaos Maker {index}</Text>
              <Text style={rightSidebarStyles.followHandle}>@chaos{index}</Text>
            </View>
            <TouchableOpacity style={rightSidebarStyles.followButton}>
              <Text style={rightSidebarStyles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

// Sidebar Styles
const sidebarStyles = StyleSheet.create({
  sidebarContainer: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'space-between',
    minHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
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
});

// RightSidebar Styles
const rightSidebarStyles = StyleSheet.create({
  rightSidebar: {
    gap: 20,
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