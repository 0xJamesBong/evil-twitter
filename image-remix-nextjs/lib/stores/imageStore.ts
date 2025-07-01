import { create } from "zustand";
import { supabase } from "../supabase";
import { apiService, BackendImage } from "../services/api";

export type Image = {
  id: string;
  user_id: string;
  url: string;
  title?: string;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

type ImageState = {
  images: Image[];
  isLoading: boolean;
  error: string | null;
};

type ImageActions = {
  uploadImage: (
    file: File,
    metadata: { title?: string; description?: string; tags?: string[] }
  ) => Promise<{ success: boolean; error?: string; image?: Image }>;
  fetchAllImages: () => Promise<void>;
  deleteImage: (
    imageId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateImage: (
    imageId: string,
    updates: Partial<Image>
  ) => Promise<{ success: boolean; error?: string }>;
};

export const useImageStore = create<ImageState & ImageActions>((set, get) => ({
  images: [],
  isLoading: false,
  error: null,

  uploadImage: async (file, metadata) => {
    set({ isLoading: true, error: null });
    try {
      // Use the backend API service
      const backendImage = await apiService.uploadImage(file, metadata);

      // Convert backend image to frontend format
      const image: Image = {
        id: backendImage.id || "",
        user_id: backendImage.uploader,
        url: backendImage.url,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        created_at: backendImage.created_at,
        updated_at: backendImage.created_at,
      };

      // Update local state
      set((state) => ({
        images: [...state.images, image],
        isLoading: false,
      }));

      return { success: true, image };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  fetchAllImages: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use the backend API service to get all images
      const backendImages = await apiService.getImages();
      console.log("backendImages", backendImages);

      // Convert backend images to frontend format
      const images: Image[] = backendImages.map((backendImage) => ({
        id: backendImage.id || "",
        user_id: backendImage.uploader,
        url: backendImage.url,
        title: undefined,
        description: undefined,
        tags: [],
        created_at: backendImage.created_at,
        updated_at: backendImage.created_at,
      }));

      set({ images, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteImage: async (imageId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Use the backend API service
      await apiService.deleteImage(imageId);

      // Update local state
      set((state) => ({
        images: state.images.filter((img) => img.id !== imageId),
        isLoading: false,
      }));

      return { success: true };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  updateImage: async (imageId: string, updates: Partial<Image>) => {
    set({ isLoading: true, error: null });
    try {
      // Convert frontend updates to backend format
      const backendUpdates: Partial<BackendImage> = {
        url: updates.url,
        uploader: updates.user_id,
      };

      const backendImage = await apiService.updateImage(
        imageId,
        backendUpdates
      );

      // Convert backend response to frontend format
      const updatedImage: Image = {
        id: backendImage.id || "",
        user_id: backendImage.uploader,
        url: backendImage.url,
        title: updates.title,
        description: updates.description,
        tags: updates.tags || [],
        created_at: backendImage.created_at,
        updated_at: backendImage.created_at,
      };

      // Update local state
      set((state) => ({
        images: state.images.map((img) =>
          img.id === imageId ? updatedImage : img
        ),
        isLoading: false,
      }));

      return { success: true };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
}));
