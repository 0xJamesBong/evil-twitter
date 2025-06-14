import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { BlurView } from "expo-blur";
import { Mail, X, ArrowLeft } from "lucide-react-native";
import { useAuthStore } from "../../stores/authStore";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthSuccess?: () => void;
}

type AuthMode = "signin" | "signup" | "reset" | null;

const AuthModal = ({
  isOpen = true,
  onClose = () => { },
  onAuthSuccess = () => { },
}: AuthModalProps) => {
  const { login, signUp, resetPassword, isLoading } = useAuthStore();
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async () => {
    console.log('Handling email auth:', { authMode, email });
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (authMode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      if (authMode === "signin") {
        console.log('Attempting login...');
        await login(email, password);
        console.log('Login successful');
        onAuthSuccess();
        onClose();
      } else if (authMode === "signup") {
        const { success, error } = await signUp(email, password);
        if (success) {
          setSuccessMessage("Please check your email to verify your account");
          setAuthMode("signin");
        } else {
          setError(error || "Sign up failed");
        }
      } else if (authMode === "reset") {
        const { success, error } = await resetPassword(email);
        if (success) {
          setSuccessMessage("Password reset instructions sent to your email");
          setAuthMode("signin");
        } else {
          setError(error || "Password reset failed");
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || "An error occurred");
    }
  };

  const renderAuthMethodSelection = () => (
    <View className="p-6 w-full">
      <Text className="text-2xl font-bold text-center mb-6 text-white">
        Sign In
      </Text>
      <TouchableOpacity
        className="flex-row items-center justify-center bg-blue-500 p-4 rounded-lg"
        onPress={() => {
          console.log('Setting auth mode to signin');
          setAuthMode("signin");
        }}
      >
        <Mail size={24} color="white" />
        <Text className="text-white font-semibold ml-2">Email / Password</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailAuth = () => (
    <View className="p-6 w-full">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => setAuthMode(null)}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">
          {authMode === "signin" ? "Sign In" : authMode === "signup" ? "Sign Up" : "Reset Password"}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {error && (
        <Text className="text-red-500 mb-4 text-center">{error}</Text>
      )}

      {successMessage && (
        <Text className="text-green-500 mb-4 text-center">{successMessage}</Text>
      )}

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

      {authMode !== "reset" && (
        <View className="mb-4">
          <Text className="text-gray-300 mb-2">Password</Text>
          <TextInput
            className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      )}

      {authMode === "signup" && (
        <View className="mb-4">
          <Text className="text-gray-300 mb-2">Confirm Password</Text>
          <TextInput
            className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
      )}

      <TouchableOpacity
        className="bg-blue-500 py-3 rounded-lg items-center mb-4"
        onPress={handleEmailAuth}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">
            {authMode === "signin" ? "Sign In" : authMode === "signup" ? "Sign Up" : "Reset Password"}
          </Text>
        )}
      </TouchableOpacity>

      {authMode === "signin" && (
        <View className="flex-row justify-between">
          <TouchableOpacity onPress={() => setAuthMode("signup")}>
            <Text className="text-blue-400">Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAuthMode("reset")}>
            <Text className="text-blue-400">Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      )}

      {authMode === "signup" && (
        <TouchableOpacity onPress={() => setAuthMode("signin")}>
          <Text className="text-blue-400 text-center">Already have an account? Sign In</Text>
        </TouchableOpacity>
      )}

      {authMode === "reset" && (
        <TouchableOpacity onPress={() => setAuthMode("signin")}>
          <Text className="text-blue-400 text-center">Back to Sign In</Text>
        </TouchableOpacity>
      )}
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
        {authMode === null && renderAuthMethodSelection()}
        {authMode !== null && renderEmailAuth()}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default AuthModal;
