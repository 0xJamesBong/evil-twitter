import { Navbar } from "@/components/Navbar";
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
  const isWide = width >= 900;

  useEffect(() => {
    initialize();
  }, [initialize]);

  const navTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const paperTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;


  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
        <View style={{ flex: 1, backgroundColor: "#000", height: '100vh' }}>
          <Navbar />

          {/* WEB / DESKTOP LAYOUT */}
          {isWeb && isWide ? (
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                maxWidth: 1200,
                width: "100%",
                marginHorizontal: "auto",
                height: 'calc(100vh - 64px)',
              }}
            >
              <View
                style={{
                  width: 256,
                  borderRightWidth: 1,
                  borderRightColor: "#333",
                  flexShrink: 0,
                }}
              >
                <Sidebar />
              </View>

              <View style={{ flex: 1, backgroundColor: "#000" }}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                </Stack>
              </View>

              <View
                style={{
                  width: 320,
                  height: '100%',
                  borderLeftWidth: 1,
                  borderLeftColor: "#333",
                  padding: 16,
                  flexShrink: 0,
                }}
              >
                <RightSidebar />
              </View>
            </View>
          ) : (
            // MOBILE/TABLET LAYOUT
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              </Stack>
            </View>
          )}

          <StatusBar style="auto" />
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}