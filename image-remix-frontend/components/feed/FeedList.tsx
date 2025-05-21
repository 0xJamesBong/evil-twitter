import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
} from "lucide-react-native";

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  media?: string;
  user: User;
}

interface FeedListProps {
  posts?: Post[];
  isLoading?: boolean;
  onEndReached?: () => void;
  onLikePress?: (postId: string) => void;
  onCommentPress?: (postId: string) => void;
  onSharePress?: (postId: string) => void;
}

const FeedList: React.FC<FeedListProps> = ({
  posts = MOCK_POSTS,
  isLoading = false,
  onEndReached = () => {},
  onLikePress = () => {},
  onCommentPress = () => {},
  onSharePress = () => {},
}) => {
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const handleLikePress = (postId: string) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
    onLikePress(postId);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View className="p-4 border-b border-gray-700 bg-gray-900">
      <View className="flex-row">
        <Image
          source={item.user.avatar}
          className="h-10 w-10 rounded-full"
          contentFit="cover"
        />
        <View className="ml-3 flex-1">
          <View className="flex-row justify-between">
            <View className="flex-row items-center">
              <Text className="font-bold text-white">{item.user.name}</Text>
              <Text className="text-gray-500 ml-1">@{item.user.username}</Text>
              <Text className="text-gray-500 ml-2">
                · {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
            <TouchableOpacity>
              <MoreHorizontal size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text className="mt-1 mb-2 text-white">{item.content}</Text>

          {item.media && (
            <Image
              source={item.media}
              className="h-48 rounded-lg mt-2 mb-3"
              contentFit="cover"
            />
          )}

          <View className="flex-row justify-between mt-2">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => handleLikePress(item.id)}
            >
              <Heart
                size={18}
                color={likedPosts[item.id] ? "#f43f5e" : "#6b7280"}
                fill={likedPosts[item.id] ? "#f43f5e" : "transparent"}
              />
              <Text
                className={`ml-1 ${likedPosts[item.id] ? "text-red-500" : "text-gray-500"}`}
              >
                {likedPosts[item.id] ? item.likes + 1 : item.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => onCommentPress(item.id)}
            >
              <MessageCircle size={18} color="#6b7280" />
              <Text className="ml-1 text-gray-500">{item.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => onSharePress(item.id)}
            >
              <Share size={18} color="#6b7280" />
              <Text className="ml-1 text-gray-500">{item.shares}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-900">
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? (
            <View className="py-4 flex items-center justify-center">
              <ActivityIndicator size="large" color="#0284c7" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

// Helper function to format time
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

// Mock data for default display
const MOCK_POSTS: Post[] = [
  {
    id: "1",
    content:
      "Just launched my new crypto project! Check it out and let me know what you think. #blockchain #crypto",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    likes: 24,
    comments: 5,
    shares: 3,
    media:
      "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&q=80",
    user: {
      id: "u1",
      name: "Alex Johnson",
      username: "alexj",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    },
  },
  {
    id: "2",
    content:
      "Working on a new AI feature for our app. The possibilities are endless!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    likes: 42,
    comments: 8,
    shares: 5,
    user: {
      id: "u2",
      name: "Sarah Miller",
      username: "sarahm",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    },
  },
  {
    id: "3",
    content:
      "Just minted my first NFT collection! So excited to be part of this community.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes: 56,
    comments: 12,
    shares: 7,
    media:
      "https://images.unsplash.com/photo-1646474743891-0d2f6c8f5f4f?w=800&q=80",
    user: {
      id: "u3",
      name: "Mike Chen",
      username: "mikec",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    },
  },
  {
    id: "4",
    content:
      "Thoughts on the latest market trends? Seems like we're heading for an interesting Q4.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    likes: 18,
    comments: 23,
    shares: 2,
    user: {
      id: "u4",
      name: "Emma Wilson",
      username: "emmaw",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    },
  },
  {
    id: "5",
    content:
      "Just attended an amazing Web3 conference! So many brilliant minds working on the future of the internet.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    likes: 87,
    comments: 14,
    shares: 9,
    media:
      "https://images.unsplash.com/photo-1591994843349-f415893b3a6b?w=800&q=80",
    user: {
      id: "u5",
      name: "Daniel Park",
      username: "danielp",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel",
    },
  },
];

export default FeedList;
