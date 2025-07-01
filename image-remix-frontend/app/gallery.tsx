import React from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { MessageCircle, Image as ImageIcon, User } from "lucide-react-native";
import ImageGalleryWithAPI from "../components/gallery/ImageGalleryWithAPI";

export default function GalleryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ title: "Gallery", headerShown: false }} />

      {/* Header removed - now in _layout.tsx */}

      <View className="flex-1 bg-black">
        <ImageGalleryWithAPI />
      </View>

      {/* Bottom Navigation removed - now in _layout.tsx */}
    </SafeAreaView>
  );
}
