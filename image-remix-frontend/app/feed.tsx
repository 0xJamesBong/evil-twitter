import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Plus,
  MessageCircle,
  Image as ImageIcon,
  User,
  Wand2,
} from "lucide-react-native";

import FeedList from "../components/feed/FeedList";
import AuthModal from "../components/auth/AuthModal";
import AIChatBox from "../components/chat/AIChatBox";

export default function MainFeedScreen() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [showChatBox, setShowChatBox] = useState(false);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width,
  );

  // Update screen dimensions when they change
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Determine if we should show text based on platform and screen width
  const shouldShowButtonText = Platform.OS === "web" && screenWidth > 768;

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // Post creation logic would go here
    console.log("Create post");
  };

  // We no longer need this effect as we're controlling the sidebar state directly in the button handlers

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <FeedList />;
      case "profile":
        return (
          <View className="flex-1 items-center justify-center bg-black p-4">
            <Image
              source={{
                uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=user123",
              }}
              style={{ width: 100, height: 100 }}
              className="rounded-full mb-4"
            />
            <Text className="text-xl font-bold mb-2 text-white">
              User Profile
            </Text>
            <Text className="text-gray-400 mb-4">@username</Text>
            {!isAuthenticated && (
              <TouchableOpacity
                className="bg-blue-500 py-2 px-4 rounded-full"
                onPress={() => setShowAuthModal(true)}
              >
                <Text className="text-white font-medium">
                  Login to view profile
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      default:
        return <FeedList />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 bg-black">
        {/* Header removed - now in _layout.tsx */}

        {/* Main Content */}
        <View className="flex-1">{renderContent()}</View>

        {/* AI Chat Button */}
        {isAuthenticated && (
          <TouchableOpacity
            className="absolute bottom-20 right-4 bg-purple-500 rounded-full p-3 shadow-lg"
            onPress={() => setShowChatBox(!showChatBox)}
          >
            <MessageCircle size={24} color="white" />
          </TouchableOpacity>
        )}

        {/* Bottom Navigation removed - now in _layout.tsx */}
      </View>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleLogin}
        />
      )}

      {/* AI Chat Box */}
      {showChatBox && (
        <AIChatBox
          isExpanded={showChatBox}
          onToggleExpand={() => setShowChatBox(!showChatBox)}
        />
      )}

      {/* Create Image Sidebar is now only rendered inside the gallery tab */}
    </SafeAreaView>
  );
}
