import { create } from "zustand";
import { supabase } from "../supabase/supabase";

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
  fetchUserImages: () => Promise<void>;
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
      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath);

      // 3. Create image record in the database
      const { data: image, error: dbError } = await supabase
        .from("images")
        .insert([
          {
            user_id: (await supabase.auth.getUser()).data.user?.id,
            url: publicUrl,
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags || [],
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Update local state
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

  fetchUserImages: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: images, error } = await supabase
        .from("images")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ images, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteImage: async (imageId: string) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Get the image to delete
      const { data: image, error: fetchError } = await supabase
        .from("images")
        .select("*")
        .eq("id", imageId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Delete from storage
      const filePath = image.url.split("/").pop();
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("images")
          .remove([filePath]);

        if (storageError) throw storageError;
      }

      // 3. Delete from database
      const { error: dbError } = await supabase
        .from("images")
        .delete()
        .eq("id", imageId);

      if (dbError) throw dbError;

      // 4. Update local state
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
      const { data: image, error } = await supabase
        .from("images")
        .update(updates)
        .eq("id", imageId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set((state) => ({
        images: state.images.map((img) =>
          img.id === imageId ? { ...img, ...image } : img
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
