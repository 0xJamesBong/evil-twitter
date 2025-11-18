import { create } from "zustand";

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
  file_id?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
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
  uploadMultipleImages: (
    files: File[],
    metadata: { title?: string; description?: string; tags?: string[] }
  ) => Promise<{
    success: boolean;
    error?: string;
    results: Array<{ success: boolean; error?: string; image?: Image }>;
  }>;
  fetchAllImages: () => Promise<void>;
  fetchUserImages: (userId: string) => Promise<void>;
  deleteImage: (
    imageId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateImage: (
    imageId: string,
    updates: Partial<Image>
  ) => Promise<{ success: boolean; error?: string }>;
  refreshImages: () => Promise<void>;
  getImagesByUser: (userId: string) => Image[];
};

// Helper function to extract ID from backend response
const extractId = (backendImage: BackendImage): string => {
  if (backendImage._id?.$oid) {
    return backendImage._id.$oid;
  }
  if (backendImage.id) {
    return backendImage.id;
  }
  return "";
};

// Helper function to extract created_at from backend response
const extractCreatedAt = (backendImage: BackendImage): string => {
  if (typeof backendImage.created_at === "string") {
    return backendImage.created_at;
  }
  if (backendImage.created_at?.$date?.$numberLong) {
    return new Date(
      parseInt(backendImage.created_at.$date.$numberLong)
    ).toISOString();
  }
  return new Date().toISOString();
};

// Helper function to extract file_id from backend response
const extractFileId = (backendImage: BackendImage): string | undefined => {
  if (backendImage.file_id?.$oid) {
    return backendImage.file_id.$oid;
  }
  return undefined;
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
        id: extractId(backendImage),
        user_id: backendImage.uploader,
        url: backendImage.url,
        title: backendImage.title || metadata.title,
        description: backendImage.description || metadata.description,
        tags: backendImage.tags || metadata.tags || [],
        created_at: extractCreatedAt(backendImage),
        updated_at: extractCreatedAt(backendImage),
        file_id: extractFileId(backendImage),
        file_name: backendImage.file_name,
        file_size: backendImage.file_size,
        mime_type: backendImage.mime_type,
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

  uploadMultipleImages: async (files, metadata) => {
    set({ isLoading: true, error: null });
    try {
      const results: Array<{
        success: boolean;
        error?: string;
        image?: Image;
      }> = [];
      for (const file of files) {
        const result = await get().uploadImage(file, metadata);
        results.push(result);
      }
      set({ isLoading: false });
      return { success: true, results };
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message, results: [] };
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
        id: extractId(backendImage),
        user_id: backendImage.uploader,
        url: backendImage.url,
        title: backendImage.title,
        description: backendImage.description,
        tags: backendImage.tags || [],
        created_at: extractCreatedAt(backendImage),
        updated_at: extractCreatedAt(backendImage),
        file_id: extractFileId(backendImage),
        file_name: backendImage.file_name,
        file_size: backendImage.file_size,
        mime_type: backendImage.mime_type,
      }));

      set({ images, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchUserImages: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Use the backend API service to get user-specific images
      const backendImages = await apiService.getUserImages(userId);
      console.log("backendImages", backendImages);

      // Convert backend images to frontend format
      const images: Image[] = backendImages.map(
        (backendImage: BackendImage) => ({
          id: extractId(backendImage),
          user_id: backendImage.uploader,
          url: backendImage.url,
          title: backendImage.title,
          description: backendImage.description,
          tags: backendImage.tags || [],
          created_at: extractCreatedAt(backendImage),
          updated_at: extractCreatedAt(backendImage),
          file_id: extractFileId(backendImage),
          file_name: backendImage.file_name,
          file_size: backendImage.file_size,
          mime_type: backendImage.mime_type,
        })
      );

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
        title: updates.title,
        description: updates.description,
        tags: updates.tags,
      };
      const backendImage = await apiService.updateImage(
        imageId,
        backendUpdates
      );
      // Convert backend response to frontend format
      const updatedImage: Image = {
        id: extractId(backendImage),
        user_id: backendImage.uploader,
        url: backendImage.url,
        title: backendImage.title,
        description: backendImage.description,
        tags: backendImage.tags || [],
        created_at: extractCreatedAt(backendImage),
        updated_at: extractCreatedAt(backendImage),
        file_id: extractFileId(backendImage),
        file_name: backendImage.file_name,
        file_size: backendImage.file_size,
        mime_type: backendImage.mime_type,
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

  refreshImages: async () => {
    await get().fetchAllImages();
  },

  getImagesByUser: (userId: string) => {
    return get().images.filter((image) => image.user_id === userId);
  },
}));
