import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Send, Minimize2, Maximize2, Bot } from "lucide-react-native";
import { BlurView } from "expo-blur";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatBoxProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  initialMessages?: Message[];
}

const AIChatBox = ({
  isExpanded = true,
  onToggleExpand = () => {},
  initialMessages = [
    {
      id: "1",
      text: "Hello! How can I assist you today?",
      isUser: false,
      timestamp: new Date(Date.now() - 60000),
    },
  ],
}: AIChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() === "") return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputText("");

    // Simulate AI typing
    setIsTyping(true);

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getAIResponse(inputText),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    // Mock AI responses based on user input
    const responses = [
      "That's an interesting point! Let me think about that...",
      "I understand what you're asking. Here's what I think...",
      "Great question! Based on my knowledge...",
      "I'd be happy to help with that!",
      "Let me provide some information on that topic.",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View
      className="bg-gray-900 rounded-t-3xl overflow-hidden"
      style={{ maxHeight: isExpanded ? 500 : 60 }}
    >
      {/* Header */}
      <BlurView intensity={80} tint="dark" className="border-b border-gray-800">
        <View className="flex-row justify-between items-center px-4 py-3">
          <View className="flex-row items-center">
            <Bot size={20} color="#38bdf8" />
            <Text className="text-white font-semibold ml-2">AI Assistant</Text>
          </View>
          <TouchableOpacity onPress={onToggleExpand}>
            {isExpanded ? (
              <Minimize2 size={20} color="#ffffff" />
            ) : (
              <Maximize2 size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Chat content - only visible when expanded */}
      {isExpanded && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 p-4"
            contentContainerStyle={{ paddingBottom: 10 }}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`mb-4 max-w-[85%] ${message.isUser ? "self-end ml-auto" : "self-start mr-auto"}`}
              >
                <View
                  className={`rounded-2xl p-3 ${message.isUser ? "bg-blue-600" : "bg-gray-800"}`}
                >
                  <Text className="text-white">{message.text}</Text>
                </View>
                <Text className="text-gray-400 text-xs mt-1">
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            ))}

            {isTyping && (
              <View className="self-start mr-auto mb-4">
                <View className="bg-gray-800 rounded-2xl p-3">
                  <View className="flex-row">
                    <Text className="text-gray-300 mr-1">Typing</Text>
                    <Text className="text-gray-300">...</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input area */}
          <View className="border-t border-gray-800 p-2">
            <View className="flex-row items-center bg-gray-800 rounded-full px-4 py-2">
              <TextInput
                className="flex-1 text-white"
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSend}
                className="ml-2 bg-blue-600 rounded-full p-2"
                disabled={inputText.trim() === ""}
              >
                <Send size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default AIChatBox;
