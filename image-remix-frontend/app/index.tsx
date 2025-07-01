import React, { useState } from "react";
import { View, SafeAreaView, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";

import ImageGallery from "../components/gallery/ImageGallery";
import ImageGalleryWithAPI from "../components/gallery/ImageGalleryWithAPI";
import AuthModal from "../components/auth/AuthModal";
import AIChatBox from "../components/chat/AIChatBox";
import { ApiTest } from "../components/ApiTest";

export default function HomeScreen() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChatBox, setShowChatBox] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 bg-black">
        {/* Main Content */}
        <ScrollView className="flex-1">
          <ApiTest />
          <View className="flex-1">
            <ImageGalleryWithAPI initialSidebarOpen={true} />
          </View>
        </ScrollView>

        {/* AI Chat Button */}
        {isAuthenticated && (
          <TouchableOpacity
            className="absolute bottom-20 right-4 bg-purple-500 rounded-full p-3 shadow-lg"
            onPress={() => setShowChatBox(!showChatBox)}
          >
            <MessageCircle size={24} color="white" />
          </TouchableOpacity>
        )}
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
    </SafeAreaView>
  );
}
