import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { X, Plus, Check } from "lucide-react-native";
import CreateImageSidebar from "../create/CreateImageSidebar";
import MasonryList from "@react-native-seoul/masonry-list";

export interface ImageItem {
  id: string;
  url: string;
  width: number;
  height: number;
  description: string;
  author: string;
}

interface ImageGalleryProps {
  images?: ImageItem[];
  columns?: number;
  loading?: boolean;
  onEndReached?: () => void;
  initialSidebarOpen?: boolean;
}

const DEFAULT_IMAGES: ImageItem[] = [
  {
    id: "1",
    url: require("../../assets/pics/daniel_craig_1.jpg"),
    width: 800,
    height: 1000,
    description: "Daniel Craig portrait",
    author: "Celebrity Photos",
  },
  {
    id: "2",
    url: require("../../assets/pics/daniel_craig_2.jpg"),
    width: 800,
    height: 600,
    description: "Daniel Craig formal",
    author: "Celebrity Photos",
  },
  {
    id: "3",
    url: require("../../assets/pics/michael_fassbender_2.jpg"),
    width: 800,
    height: 1200,
    description: "Michael Fassbender portrait",
    author: "Celebrity Photos",
  },
  {
    id: "4",
    url: require("../../assets/pics/michael_fassbender_3.png"),
    width: 800,
    height: 1000,
    description: "Michael Fassbender casual",
    author: "Celebrity Photos",
  },
  {
    id: "5",
    url: require("../../assets/pics/michael_fassbender_4.png"),
    width: 800,
    height: 900,
    description: "Michael Fassbender profile",
    author: "Celebrity Photos",
  },
  {
    id: "6",
    url: require("../../assets/pics/reynold_poernomo_3.png"),
    width: 800,
    height: 1100,
    description: "Reynold Poernomo portrait",
    author: "Celebrity Photos",
  },
  {
    id: "7",
    url: require("../../assets/pics/tom_holland_5.jpg"),
    width: 800,
    height: 800,
    description: "Tom Holland casual",
    author: "Celebrity Photos",
  },
  {
    id: "8",
    url: require("../../assets/pics/tom_holland_6.jpg"),
    width: 800,
    height: 1000,
    description: "Tom Holland formal",
    author: "Celebrity Photos",
  },
  {
    id: "9",
    url: require("../../assets/pics/tom_holland_7.jpg"),
    width: 800,
    height: 1000,
    description: "Tom Holland portrait",
    author: "Celebrity Photos",
  },
];

const ImageGallery = ({
  images = DEFAULT_IMAGES,
  columns = 3,
  loading = false,
  onEndReached = () => {},
  initialSidebarOpen = false,
}: ImageGalleryProps) => {
  const [selectedColumns, setSelectedColumns] = useState(columns);
  // Get URL parameters for sidebar visibility
  const getUrlParam = () => {
    if (typeof window !== "undefined") {
      return (
        new URLSearchParams(window.location.search).get("showSidebar") ===
        "true"
      );
    }
    return false;
  };

  // Set initial sidebar state based on both prop and URL parameter
  const [showSidebar, setShowSidebar] = useState(() => {
    return initialSidebarOpen || getUrlParam();
  });

  // Track selected images for ingredients
  const [selectedIngredients, setSelectedIngredients] = useState<ImageItem[]>(
    [],
  );

  // Update sidebar state when URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      setShowSidebar(initialSidebarOpen || getUrlParam());
    };

    // Set initial state
    handleUrlChange();

    // Listen for URL changes
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handleUrlChange);
      return () => window.removeEventListener("popstate", handleUrlChange);
    }
  }, [initialSidebarOpen]);

  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    // Calculate column widths
    if (screenWidth > 0 && selectedColumns > 0) {
      const padding = 16; // Total horizontal padding
      const gutter = 8 * (selectedColumns - 1); // Space between columns
      const availableWidth = screenWidth - padding - gutter;
      const widths = Array(selectedColumns).fill(
        availableWidth / selectedColumns,
      );
      setColumnWidths(widths);
    }
  }, [selectedColumns, screenWidth]);

  // We no longer need to manually distribute images as MasonryList handles this for us

  const handleImagePress = (image: ImageItem) => {
    setSelectedImage(image);
  };

  const toggleImageSelection = (image: ImageItem) => {
    setSelectedIngredients((prev) => {
      // Check if image is already selected
      const isAlreadySelected = prev.some((item) => item.id === image.id);

      if (isAlreadySelected) {
        // Remove from selection
        return prev.filter((item) => item.id !== image.id);
      } else {
        // Add to selection if under 5 images
        if (prev.length < 5) {
          return [...prev, image];
        }
        return prev; // Don't add if already at 5 images
      }
    });
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;

    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      onEndReached();
    }
  };

  return (
    <View className="flex-1 bg-gray-900 flex-row">
      {/* Create Image Sidebar */}
      {showSidebar && (
        <View className="w-1/3">
          <CreateImageSidebar
            isVisible={true}
            onClose={() => setShowSidebar(false)}
            selectedImages={selectedIngredients}
            onClearSelection={() => setSelectedIngredients([])}
          />
        </View>
      )}

      <View className={`${showSidebar ? "w-2/3" : "flex-1"} bg-gray-900`}>
        <View className="flex-1 px-2">
          <View className="flex-row justify-between items-center px-2 py-4">
            <Text className="text-2xl font-bold text-white">Discover</Text>
            <View className="flex-row bg-gray-800 rounded-lg overflow-hidden">
              {[1, 3, 5].map((col) => (
                <Pressable
                  key={col}
                  onPress={() => setSelectedColumns(col)}
                  className={`px-4 py-2 ${selectedColumns === col ? "bg-blue-600" : "bg-transparent"}`}
                >
                  <Text
                    className={`${selectedColumns === col ? "text-white font-bold" : "text-gray-300"}`}
                  >
                    {col}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <MasonryList
            data={images}
            keyExtractor={(item: ImageItem) => item.id}
            numColumns={selectedColumns}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: ImageItem }) => {
              return (
                <TouchableOpacity
                  className="mb-2 mx-1 rounded-lg overflow-hidden relative group"
                  onPress={() => handleImagePress(item)}
                >
                  <Image
                    source={item.url}
                    style={{
                      width: "100%",
                      height: undefined,
                      aspectRatio: item.width / item.height,
                      backgroundColor: "#2a2a2a",
                    }}
                    contentFit="cover"
                    transition={200}
                  />

                  {/* Selection button */}
                  <TouchableOpacity
                    className={`absolute bottom-2 right-2 p-1.5 rounded-full ${selectedIngredients.some((img) => img.id === item.id) ? "bg-blue-600" : "bg-black/50"}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleImageSelection(item);
                    }}
                  >
                    {selectedIngredients.some((img) => img.id === item.id) ? (
                      <Check size={16} color="white" />
                    ) : (
                      <Plus size={16} color="white" />
                    )}
                  </TouchableOpacity>

                  {/* Selection count badge */}
                  {selectedIngredients.some((img) => img.id === item.id) && (
                    <View className="absolute top-2 right-2 bg-blue-600 rounded-full w-5 h-5 items-center justify-center">
                      <Text className="text-white text-xs font-bold">
                        {selectedIngredients.findIndex(
                          (img) => img.id === item.id,
                        ) + 1}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#60a5fa" />
                </View>
              ) : (
                <View className="h-20" />
              )
            }
          />

          {/* Image Detail Modal */}
          <Modal
            visible={selectedImage !== null}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCloseModal}
          >
            <View className="flex-1 bg-black/90 justify-center items-center">
              <TouchableOpacity
                className="absolute top-10 right-5 z-10 p-2 bg-black/50 rounded-full"
                onPress={handleCloseModal}
              >
                <X size={24} color="white" />
              </TouchableOpacity>

              {selectedImage && (
                <View className="w-full px-4">
                  <Image
                    source={selectedImage.url}
                    style={{
                      width: "100%",
                      height: undefined,
                      aspectRatio: selectedImage.width / selectedImage.height,
                      maxHeight: Dimensions.get("window").height * 0.7,
                    }}
                    contentFit="contain"
                  />

                  <View className="bg-gray-800/90 p-4 mt-2 rounded-lg">
                    <Text className="text-white text-lg font-semibold">
                      {selectedImage.description}
                    </Text>
                    <Text className="text-white/80 mt-1">
                      By {selectedImage.author}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Modal>
        </View>
      </View>
    </View>
  );
};

export default ImageGallery;
