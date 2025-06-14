import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Image } from "expo-image";
import { useAuthStore } from "../stores/authStore";

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.user_metadata?.username || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await updateUser({
        data: { username: username.trim() }
      });

      if (!success) throw new Error(error);

      Alert.alert("Success", "Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 items-center justify-start bg-black p-4">
        <Image
          source={{
            uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "user123"}`,
          }}
          style={{ width: 120, height: 120 }}
          className="rounded-full mb-4"
        />

        {isEditing ? (
          <View className="w-full max-w-sm">
            <TextInput
              className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white mb-4"
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#666"
            />
            <View className="flex-row justify-end space-x-2">
              <TouchableOpacity
                className="bg-gray-600 py-2 px-4 rounded-lg"
                onPress={() => setIsEditing(false)}
              >
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 py-2 px-4 rounded-lg"
                onPress={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text className="text-xl font-bold mb-2 text-white">
              {user?.user_metadata?.username || "User"}
            </Text>
            <Text className="text-gray-400 mb-4">{user?.email}</Text>
            <TouchableOpacity
              className="bg-blue-500 py-2 px-4 rounded-lg mb-4"
              onPress={() => setIsEditing(true)}
            >
              <Text className="text-white">Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          className="bg-red-500 py-2 px-4 rounded-lg mt-4"
          onPress={logout}
        >
          <Text className="text-white">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
