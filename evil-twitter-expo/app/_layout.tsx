import { Stack } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { Platform, useColorScheme, useWindowDimensions } from "react-native";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { ScrollView, View } from "react-native";
import { RightSidebar } from "@/components/RightSidebar";


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
        <View style={{ flex: 1, backgroundColor: "#000" }}>
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
                paddingTop: 64,
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

              <ScrollView
                style={{ flex: 1, backgroundColor: "#000" }}
                contentContainerStyle={{
                  flexGrow: 1,
                  alignItems: "stretch",
                  paddingBottom: 120,
                }}
                showsVerticalScrollIndicator={false}
              >
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="modal" options={{ presentation: "modal" }} />
                </Stack>
              </ScrollView>

              <View
                style={{
                  width: 320,
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
            <ScrollView
              style={{ flex: 1, backgroundColor: "#000" }}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              </Stack>
            </ScrollView>
          )}

          <StatusBar style="auto" />
        </View>
      </ThemeProvider>
    </PaperProvider>
  );
}