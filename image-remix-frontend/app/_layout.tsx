import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import "react-native-reanimated";
// import "../global.css";
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import {
  MessageCircle,
  Image as ImageIcon,
  User,
  Wand2,
  Plus,
} from "lucide-react-native";
import { StoreProvider } from "../stores/store-provider";
import AuthModal from "../components/auth/AuthModal";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuthStore } from "../stores/authStore";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();



function RootLayoutNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, logout, user } = useAuthStore();
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Update screen dimensions when they change
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Determine if we should show text based on platform and screen width
  const shouldShowButtonText = Platform.OS === "web" && screenWidth > 768;

  const handleAuthModalClose = useCallback(() => {
    console.log('Auth modal closed');
    setShowAuthModal(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    console.log('Auth success');
    setShowAuthModal(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-gray-800">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.push("/")}
          >
            {/* <Image
              source={require("../assets/logo.png")}
              style={{ width: 32, height: 32 }}
              className="rounded-lg"
            /> */}
            {shouldShowButtonText && (
              <Text className="text-white font-bold text-xl ml-2">
                Image Remix
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row">
            <TouchableOpacity
              className={`bg-purple-600 rounded-full ${shouldShowButtonText ? "px-4 py-2" : "p-2"} mr-2 flex-row items-center`}
              onPress={() => router.push("/gallery?showSidebar=true")}
            >
              <Wand2 size={20} color="white" />
              {shouldShowButtonText && (
                <Text className="text-white font-medium ml-2">Generate</Text>
              )}
            </TouchableOpacity>

            {isAuthenticated ? (
              <View className="flex-row items-center">
                <View className="mr-3">
                  <Text className="text-white text-sm">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-red-500 rounded-full p-2"
                  onPress={logout}
                >
                  <Text className="text-white font-medium text-sm">Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-blue-500 py-2 px-4 rounded-full"
                onPress={() => {
                  console.log('Login button pressed');
                  setShowAuthModal(true);
                }}
              >
                <Text className="text-white font-medium">Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="flex-1">
          <Stack
            screenOptions={({ route }) => ({
              headerShown: false,
            })}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </View>

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={handleAuthModalClose}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Add your custom fonts here if needed
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <StoreProvider>
      {/* <ThemeProvider value={DarkTheme}> */}
      <ProtectedRoute>
        <RootLayoutNav />
      </ProtectedRoute>
      {/* </ThemeProvider> */}
    </StoreProvider>
  );
}