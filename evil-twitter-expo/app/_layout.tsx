import { RightSidebar } from "@/components/RightSidebar";
import { Sidebar } from "@/components/Sidebar";
import { useAuthStore } from "@/lib/stores/authStore";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, useColorScheme, useWindowDimensions, View } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isWide = width >= 1000;

  useEffect(() => {
    initialize();
  }, [initialize]);

  const navTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const paperTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
        <View style={{ flex: 1, backgroundColor: "#000", minHeight: '100vh' }}>
          {/* WEB / DESKTOP LAYOUT - Twitter-style 3-column layout */}
          {isWeb && isWide ? (
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                maxWidth: 1280,
                width: "100%",
                marginHorizontal: "auto",
                minHeight: '100vh',
              }}
            >
              {/* Left Sidebar - Fixed width */}
              <View
                style={{
                  width: 275,
                  minHeight: '100vh',
                  borderRightWidth: 1,
                  borderRightColor: "#2f3336",
                  flexShrink: 0,
                  position: 'sticky',
                  top: 0,
                  height: '100vh',
                }}
              >
                <Sidebar />
              </View>

              {/* Main Content Area */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#000",
                  minWidth: 600,
                  maxWidth: 600,
                  borderRightWidth: 1,
                  borderRightColor: "#2f3336",
                }}
              >
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                </Stack>
              </View>

              {/* Right Sidebar - Fixed width */}
              <View
                style={{
                  width: 350,
                  minHeight: '100vh',
                  paddingHorizontal: 16,
                  flexShrink: 0,
                  position: 'sticky',
                  top: 0,
                  height: '100vh',
                }}
              >
                <RightSidebar />
              </View>
            </View>
          ) : (
            // MOBILE/TABLET LAYOUT - Simplified for mobile
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              </Stack>
            </View>
          )}

          <StatusBar style="light" />
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}