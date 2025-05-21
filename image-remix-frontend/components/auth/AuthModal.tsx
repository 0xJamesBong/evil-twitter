import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { BlurView } from "expo-blur";
import { Wallet, Mail, X } from "lucide-react-native";
import { Image } from "expo-image";

import { useAuthStore } from "@/stores/store-provider";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthSuccess?: () => void;
}


const AuthModal = ({
  isOpen = true,
  onClose = () => { },
  onAuthSuccess = () => { },
}: AuthModalProps) => {

  const { user, login, logout } = useAuthStore(state => state)

  const [authMethod, setAuthMethod] = useState<"wallet" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleWalletConnect = () => {
    // Placeholder for wallet connection logic
    console.log("Connecting wallet...");
    onAuthSuccess();
    onClose();
  };

  const handleEmailLogin = async () => {
    try {
      await login(email, password);
      onAuthSuccess();
      onClose();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const renderAuthMethodSelection = () => (
    <View className="p-6 w-full">
      <Text className="text-2xl font-bold text-center mb-6 text-white">
        Sign In
      </Text>
      <TouchableOpacity
        className="flex-row items-center justify-center bg-purple-600 p-4 rounded-lg mb-4"
        onPress={() => setAuthMethod("wallet")}
      >
        <Wallet size={24} color="white" />
        <Text className="text-white font-semibold ml-2">Connect Wallet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center justify-center bg-blue-500 p-4 rounded-lg"
        onPress={() => setAuthMethod("email")}
      >
        <Mail size={24} color="white" />
        <Text className="text-white font-semibold ml-2">
          Email / Google Login
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWalletConnect = () => (
    <View className="p-6 w-full">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-white">Connect Wallet</Text>
        <TouchableOpacity onPress={() => setAuthMethod(null)}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="items-center justify-center py-8">
        <Image
          source={{ uri: "https://api.dicebear.com/7.x/avataaars/svg?seed=wallet" }}
          style={{ width: 100, height: 100 }}
          className="rounded-full mb-4"
        />
        <Text className="text-gray-300 mb-6 text-center">
          Connect your Phantom wallet to continue
        </Text>

        <TouchableOpacity
          className="bg-purple-600 py-3 px-6 rounded-lg w-full items-center"
          onPress={handleWalletConnect}
        >
          <Text className="text-white font-semibold">Connect Phantom</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmailLogin = () => (
    <View className="p-6 w-full">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-white">Sign In</Text>
        <TouchableOpacity onPress={() => setAuthMethod(null)}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="mb-4">
        <Text className="text-gray-300 mb-2">Email</Text>
        <TextInput
          className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View className="mb-6">
        <Text className="text-gray-300 mb-2">Password</Text>
        <TextInput
          className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        className="bg-blue-500 py-3 rounded-lg items-center mb-4"
        onPress={handleEmailLogin}
      >
        <Text className="text-white font-semibold">Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity className="items-center">
        <Text className="text-blue-400">Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableOpacity
      className="absolute inset-0 justify-center items-center bg-black bg-opacity-70 z-50"
      activeOpacity={1}
      onPress={onClose}
    >
      <BlurView intensity={80} tint="dark" className="absolute inset-0" />
      <TouchableOpacity
        className="bg-gray-900 rounded-2xl w-[350px] overflow-hidden border border-gray-800"
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
      >
        {authMethod === null && renderAuthMethodSelection()}
        {authMethod === "wallet" && renderWalletConnect()}
        {authMethod === "email" && renderEmailLogin()}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default AuthModal;
