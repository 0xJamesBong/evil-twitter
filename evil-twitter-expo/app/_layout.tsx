import { ReplyModal } from "@/components/ReplyModal";
import { Sidebar } from "@/components/Sidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { API_BASE_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, SafeAreaView, StyleSheet, useColorScheme, useWindowDimensions, View } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const showRightSidebar = width >= 1200;
  const isCompactSidebar = width < 1024;
  const isStackedLayout = width < 768;

  // Initialize authentication
  const { initialize, user, isAuthenticated, initialized, isLoading } = useAuthStore();

  useEffect(() => {
    console.log("Initializing authentication...");
    initialize();
  }, [initialize]);

  // Debug auth state
  useEffect(() => {
    console.log("Auth State Debug:", {
      initialized,
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      userId: user?.id
    });
  }, [initialized, isAuthenticated, isLoading, user]);

  console.log("API_BASE_URL: ", API_BASE_URL);

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
          <ReplyModal />
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


// RightSidebar Component - Using the imported component instead
