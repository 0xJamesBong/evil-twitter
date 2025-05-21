import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Stack } from "expo-router";
import { Image } from "expo-image";

export default function ProfileScreen() {
  const isAuthenticated = false; // This would come from your auth context

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 items-center justify-center bg-black p-4">
        <Image
          source={{
            uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=user123",
          }}
          style={{ width: 100, height: 100 }}
          className="rounded-full mb-4"
        />
        <Text className="text-xl font-bold mb-2 text-white">User Profile</Text>
        <Text className="text-gray-400 mb-4">@username</Text>
        {!isAuthenticated && (
          <TouchableOpacity className="bg-blue-500 py-2 px-4 rounded-full">
            <Text className="text-white font-medium">
              Login to view profile
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
