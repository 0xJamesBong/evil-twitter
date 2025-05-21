import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import "react-native-reanimated";
import "../global.css";
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
import { StoreProvider, useAuthStore } from "../stores/store-provider";
import AuthModal from "../components/auth/AuthModal";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
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
    setShowAuthModal(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Top Navigation Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-700 bg-black">
        {/* Logo */}
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.push("/")}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&q=80",
            }}
            style={{ width: 32, height: 32 }}
            className="rounded-full"
          />
          <Text className="ml-2 text-xl font-bold text-white">
            SocialFeed
          </Text>
        </TouchableOpacity>

        {/* Navigation Links */}
        <View className="flex-row items-center">
          <TouchableOpacity
            className={`mx-3 items-center ${pathname === "/feed" ? "opacity-100" : "opacity-50"}`}
            onPress={() => router.push("/feed")}
          >
            <MessageCircle size={20} color="#fff" />
            {shouldShowButtonText && (
              <Text className="text-xs text-white">Feed</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className={`mx-3 items-center ${pathname === "/" ? "opacity-100" : "opacity-50"}`}
            onPress={() => router.push("/")}
          >
            <ImageIcon size={20} color="#fff" />
            {shouldShowButtonText && (
              <Text className="text-xs text-white">Gallery</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className={`mx-3 items-center ${pathname === "/profile" ? "opacity-100" : "opacity-50"}`}
            onPress={() => router.push("/profile")}
          >
            <User size={20} color="#fff" />
            {shouldShowButtonText && (
              <Text className="text-xs text-white">Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
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
            <TouchableOpacity className="bg-blue-500 rounded-full p-2">
              <Plus size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-blue-500 py-2 px-4 rounded-full"
              onPress={() => setShowAuthModal(true)}
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
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === "web") {
      const { TempoDevtools } = require("tempo-devtools");
      TempoDevtools.init();
    }
  }, []);

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
      <ThemeProvider value={DarkTheme}>
        <RootLayoutNav />
      </ThemeProvider>
    </StoreProvider>
  );
}