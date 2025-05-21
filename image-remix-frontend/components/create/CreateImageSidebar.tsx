import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { X, RefreshCw, Zap, Upload } from "lucide-react-native";
import { useDropzone } from "react-dropzone";
import { ImageItem } from "../gallery/ImageGallery";

interface CreateImageSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  selectedImages?: SelectedImage[];
  onClearSelection?: () => void;
}

type AspectRatio = "square" | "landscape" | "portrait";

interface SelectedImage {
  id: string;
  file?: File;
  preview: string;
  url?: any; // Can be a require() result or a string URL
  width?: number;
  height?: number;
  description?: string;
  author?: string;
}

const CreateImageSidebar = ({
  isVisible,
  onClose,
  selectedImages: externalSelectedImages = [],
  onClearSelection,
}: CreateImageSidebarProps) => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("square");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  // Sync with external selected images
  useEffect(() => {
    if (externalSelectedImages && externalSelectedImages.length > 0) {
      // Convert external images to our format if needed
      const formattedImages = externalSelectedImages.map((img) => ({
        id: img.id,
        preview:
          typeof img.url === "string" ? img.url : "preview-not-available",
        url: img.url,
        width: img.width,
        height: img.height,
        description: img.description,
        author: img.author,
      }));

      // Merge with existing local images that aren't from external selection
      // First, identify which images are from local uploads (not in externalSelectedImages)
      const localImageIds = selectedImages
        .filter(
          (img) =>
            !externalSelectedImages.some((extImg) => extImg.id === img.id),
        )
        .map((img) => img.id);

      const localImages = selectedImages.filter((img) =>
        localImageIds.includes(img.id),
      );

      // Combine external and local images
      setSelectedImages([...formattedImages, ...localImages]);
    } else if (
      externalSelectedImages &&
      externalSelectedImages.length === 0 &&
      selectedImages.length > 0
    ) {
      // If external selection was cleared, keep only local uploads
      const localImages = selectedImages.filter(
        (img) => !externalSelectedImages.some((extImg) => extImg.id === img.id),
      );
      setSelectedImages(localImages);
    }
  }, [externalSelectedImages]);

  const handleReset = () => {
    setPrompt("");
    setAspectRatio("square");
    setSelectedImages([]); // Clear all local images
    if (onClearSelection) {
      onClearSelection(); // Clear external selection
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Map the accepted files to our SelectedImage format
    const newImages = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...newImages]);
  }, []);

  // Handle dropped gallery images
  const handleGalleryImageDrop = useCallback((imageItem: ImageItem) => {
    // Convert the gallery image to our SelectedImage format
    const newImage: SelectedImage = {
      id: imageItem.id,
      preview:
        typeof imageItem.url === "string"
          ? imageItem.url
          : "preview-not-available",
      url: imageItem.url,
      width: imageItem.width,
      height: imageItem.height,
      description: imageItem.description,
      author: imageItem.author,
    };

    // Add to selected images if not already present
    setSelectedImages((prev) => {
      // Check if this image is already in our selection
      if (prev.some((img) => img.id === imageItem.id)) {
        return prev; // Skip if already in the list
      }

      // Make sure we don't exceed 5 images total
      const updatedImages = [...prev, newImage];
      return updatedImages.slice(0, 5);
    });

    // Visual feedback for successful drop
    if (Platform.OS === "web") {
      const dropZone = document.querySelector("[data-dropzone='true']");
      if (dropZone) {
        dropZone.classList.add("bg-blue-500/20");
        setTimeout(() => {
          dropZone.classList.remove("bg-blue-500/20");
        }, 300);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxFiles: 5,
  });

  const removeImage = (id: string) => {
    // First update our local state
    setSelectedImages((prev) => prev.filter((image) => image.id !== id));

    // If this image is part of the external selection and we have a callback
    if (
      onClearSelection &&
      externalSelectedImages.some((img) => img.id === id)
    ) {
      // Clear the external selection
      onClearSelection();

      // Important: We need to preserve our other local images that weren't from external selection
      // This will happen automatically in the next render cycle because we're not clearing our local state,
      // just the external selection
    }
  };

  const getEnergyConsumption = () => {
    // Placeholder for energy consumption calculation
    return "10";
  };

  if (!isVisible) return null;

  return (
    <View className="h-full bg-gray-900 border-r border-gray-700">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-700">
        <Text className="text-xl font-bold text-white">Create Image</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-gray-300 mb-2 font-medium">Prompt</Text>
          <TextInput
            className="border border-gray-700 rounded-lg p-3 bg-gray-800 text-white min-h-[100px]"
            placeholder="Describe the image you want to create..."
            placeholderTextColor="#6b7280"
            multiline
            value={prompt}
            onChangeText={setPrompt}
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-300 mb-2 font-medium">
            Image Ingredients
          </Text>
          <View
            {...getRootProps()}
            data-dropzone="true"
            className={`border-2 border-dashed ${isDragActive ? "border-blue-500" : "border-gray-600"} rounded-lg p-4 bg-gray-800 min-h-[100px] flex items-center justify-center transition-colors duration-200`}
            onDragOver={(e) => {
              if (Platform.OS === "web" && e.nativeEvent) {
                e.preventDefault();
                // Add visual feedback for drag over
                const target = e.currentTarget as HTMLElement;
                target.classList.add("border-blue-400", "bg-blue-900/20");
              }
            }}
            onDragLeave={(e) => {
              if (Platform.OS === "web" && e.nativeEvent) {
                // Remove visual feedback when drag leaves
                const target = e.currentTarget as HTMLElement;
                target.classList.remove("border-blue-400", "bg-blue-900/20");
              }
            }}
            onDrop={(e) => {
              if (Platform.OS === "web" && e.nativeEvent) {
                e.preventDefault();
                // Remove drag over styling
                const target = e.currentTarget as HTMLElement;
                target.classList.remove("border-blue-400", "bg-blue-900/20");

                const dataTransfer = e.nativeEvent.dataTransfer;
                if (dataTransfer) {
                  try {
                    const jsonData = dataTransfer.getData("application/json");
                    if (jsonData) {
                      const imageItem = JSON.parse(jsonData);
                      handleGalleryImageDrop(imageItem);
                    }
                  } catch (error) {
                    console.error("Error parsing dropped image data:", error);
                  }
                }
              }
            }}
          >
            <input {...getInputProps()} />
            {selectedImages.length === 0 ? (
              <View className="items-center justify-center">
                <Upload size={24} color="#9ca3af" />
                <Text className="text-gray-400 text-center mt-2">
                  {isDragActive
                    ? "Drop images here"
                    : "Drag images from gallery or click to upload"}
                </Text>
                {Platform.OS === "web" && (
                  <Text className="text-blue-400 text-xs text-center mt-2">
                    Tip: Drag images from the gallery to use as ingredients
                  </Text>
                )}
              </View>
            ) : (
              <View className="w-full">
                <View className="flex-row flex-wrap">
                  {selectedImages.map((image) => (
                    <View key={image.id} className="relative w-12 h-12 m-1">
                      <Image
                        source={image.url || { uri: image.preview }}
                        className="w-full h-full rounded-md object-cover"
                        style={{ width: 48, height: 48 }}
                      />
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        onPress={() => removeImage(image.id)}
                      >
                        <X size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    className="w-12 h-12 m-1 border border-dashed border-gray-600 rounded-md items-center justify-center"
                    {...getRootProps()}
                  >
                    <Upload size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-gray-300 mb-2 font-medium">Aspect Ratio</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg mr-2 ${aspectRatio === "square" ? "bg-blue-600" : "bg-gray-800"}`}
              onPress={() => setAspectRatio("square")}
            >
              <Text className="text-white text-center">Square</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                1024×1024
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg mx-1 ${aspectRatio === "landscape" ? "bg-blue-600" : "bg-gray-800"}`}
              onPress={() => setAspectRatio("landscape")}
            >
              <Text className="text-white text-center">Landscape</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                1216×832
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg ml-2 ${aspectRatio === "portrait" ? "bg-blue-600" : "bg-gray-800"}`}
              onPress={() => setAspectRatio("portrait")}
            >
              <Text className="text-white text-center">Portrait</Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                832×1216
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View className="p-4 border-t border-gray-700">
        <TouchableOpacity className="bg-purple-600 py-3 rounded-lg items-center mb-3 flex-row justify-center">
          <Zap size={20} color="#fff" />
          <Text className="text-white font-semibold ml-2">
            Generate ({getEnergyConsumption()} energy)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="border border-gray-600 py-3 rounded-lg items-center flex-row justify-center"
          onPress={handleReset}
        >
          <RefreshCw size={20} color="#fff" />
          <Text className="text-white font-semibold ml-2">Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreateImageSidebar;
